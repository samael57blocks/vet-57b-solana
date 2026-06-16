# Design: Roles Integration — Owner & Vet Separation

## Technical Approach

Solana-first: Anchor program changes → TS client → Go backend → UI. Each layer builds on the previous. The `owner` field is added to `MedicalRecord` without changing PDA seeds, preserving backward compatibility for existing record lookups. OwnerProfile is a new account type with its own seed domain.

## Architecture Decisions

### Decision: `owner` as field, not seed change

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `owner` to seeds `[b"medical-record", owner, id]` | Changes PDA derivation — breaks all existing lookups, can't read old records | ❌ |
| Add `owner` as field, keep seeds `[b"medical-record", id]` | Requires paying rent for migrated records; no lookup breakage | ✅ |
| Optional `owner` field (COption) | Adds Anchor overhead, complicates deserialization, weakens domain model | ❌ |

**Choice**: Add `owner: Pubkey` as required field. Seeds unchanged. Records created before this change will fail deserialization — accepted since we redeploy on localnet.

### Decision: OwnerProfile account layout

**Choice**: `owner: Pubkey` + `name: String` (max 64 chars) + `bump: u8`. Space: `8 + 32 + (4+64) + 1 = 109` bytes. Seeds: `[b"owner-profile", owner_wallet.key]`. Duplicate registration guarded by Anchor `init` constraint (account already exists → error).

### Decision: Role detection strategy

**Choice**: Fetch `program.account.ownerProfile.all()` filtered by connected wallet pubkey. Empty result = vet. Non-empty = owner. This is simpler than PDA-check (no derivation needed) and uses Anchor's built-in `memcmp` filter. Tradeoff: an extra RPC call on wallet connect. Acceptable for MVP.

### Decision: Pay authorization

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `medical_record` account to `PayMedicalAppointmentAccounts` | Extra account in tx, but enables direct `authority == record.owner` check | ✅ |
| Derive `owner` from appointment storage | Appointment lacks `owner` — would need another account lookup anyway | ❌ |

**Choice**: Add `medical_record: Account<MedicalRecord>` to `PayMedicalAppointmentAccounts`. Validate `authority.key() == medical_record.owner` in the instruction handler. The `seeds` constraint on `medical_record` prevents spoofing.

### Decision: Owner dropdown data source

**Choice**: Fetch via `program.account.ownerProfile.all()` on the frontend. No backend proxy needed — this is a read from the Anchor program's account deserialization. For MVP, load all profiles; the count is bounded by real-world owners.

### Decision: Wallet-based signer unification

**Choice**: Keep the existing dual pattern. `VetProgram` class in `solana/app/` continues accepting `Keypair` for test usage. The web-app services (`petService.ts`, `appointmentService.ts`) already use `program.provider?.publicKey` with `program.methods...rpc()`, which delegates signing to the wallet provider. No change needed — the provider handles wallet signing transparently.

## Data Flow

```
register_owner
  Wallet → register_owner(name) → OwnerProfile PDA created → OwnerProfileCreated event

register_pet
  Vet → register_pet(input + owner) → MedicalRecord (with owner field) → MedicalRecordCreated (with owner)

pay_medical_appointment
  Owner → pay_medical_appointment(amount) → validates authority == record.owner → updates paidValue
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `solana/programs/vet-57b/src/lib.rs` | Modify | Add `OwnerProfile` account, `register_owner` instruction, `owner` field on `MedicalRecord`, auth check in pay, `OwnerProfileCreated` event, updated `MedicalRecordCreated` event |
| `solana/app/models/owner_profile.model.ts` | Create | OwnerProfile interface + static deriveAddress method |
| `solana/app/models/events/owner_profile_created.model.ts` | Create | OwnerProfileCreated event interface |
| `solana/app/models/events/medical_record_created.model.ts` | Modify | Add `owner: PublicKey` field |
| `solana/app/models/medical_record.model.ts` | Modify | Add `owner` field to MedicalRecord interface |
| `solana/app/models/index.ts` | Modify | Export new models |
| `solana/tests/helpers/data_mothers/owner_profile.helper.ts` | Create | Data mother for owner profile tests |
| `solana/tests/owner_profile.spec.ts` | Create | Tests for register_owner |
| `solana/tests/medical_record.spec.ts` | Modify | Add owner field in tests |
| `solana/tests/pay_appointment.spec.ts` | Modify | Test non-owner rejection |
| `web-app/src/solana/hooks/useRole.ts` | Create | `{ role, ownerProfile }` hook |
| `web-app/src/solana/hooks/useRoleContext.tsx` | Create | Role context provider |
| `web-app/src/pages/OwnerSignup.tsx` | Create | Owner registration page |
| `web-app/src/pets/components/PetRegistrationForm.tsx` | Modify | Add owner dropdown, role gate |
| `web-app/src/pets/pages/PetsOverview.tsx` | Modify | Role-filtered pet list |
| `web-app/src/appointments/components/AppointmentForm.tsx` | Modify | Vet-only gate |
| `web-app/src/appointments/components/AppointmentList.tsx` | Modify | Pay button only for owner |
| `web-app/src/router.tsx` | Modify | Add owner signup route |
| `backend/internal/db/migrations/002_roles.sql` | Create | `owner_profiles` table, `owner_id` on `pets` |
| `backend/internal/models/models.go` | Modify | Add `OwnerProfile` struct, `OwnerID` on `Pet` |
| `backend/internal/api/owners.go` | Create | Owner profile resource + handler |
| `backend/internal/api/queries.go` | Modify | Add `GetOwnerProfile`, `ListPets` with `ownerId` filter |
| `backend/internal/api/router.go` | Modify | Mount `/owners` resource |
| `backend/internal/listener/eventstore.go` | Modify | Add `UpsertOwnerProfileParams` + `UpsertOwnerProfile` |
| `backend/internal/listener/dbadapter.go` | Modify | Bridge `UpsertOwnerProfile` |
| `backend/internal/listener/discriminators.go` | Modify | Add `OwnerProfileCreated` discriminator |
| `backend/internal/listener/websocket.go` | Modify | Handle `OwnerProfileCreated`, updated `MedicalRecordCreated` |

## Interfaces / Contracts

```rust
// New account
#[account]
pub struct OwnerProfile {
    pub owner: Pubkey,
    pub name: String,     // max 64 chars
    pub bump: u8,
}

// Updated MedicalRecord
pub struct MedicalRecord {
    pub id: Pubkey,
    pub owner: Pubkey,     // NEW
    pub name: String,
    pub age: u8,
    pub animal_type: AnimalType,
    pub caretaker_name: String,
    pub caretaker_phone: String,
    pub bump: u8,
}

// New event
#[event]
pub struct OwnerProfileCreated {
    pub owner: Pubkey,
    pub name: String,
}

// Updated event
#[event]
pub struct MedicalRecordCreated {
    pub id: Pubkey,
    pub owner: Pubkey,     // NEW
    pub name: String,
    pub age: u8,
    pub animal_type: AnimalType,
    pub caretaker_name: String,
    pub caretaker_phone: String,
}
```

```typescript
// TS — new model
export interface OwnerProfile {
  owner: PublicKey;
  name: string;
}

export class OwnerProfile {
  static deriveAddress(owner: PublicKey, programId: PublicKey): PublicKey { ... }
}

// TS — updated model
export interface MedicalRecord {
  id: PublicKey;
  owner: PublicKey; // NEW
  name: string;
  ...
}
```

## Account Space

| Account | Calculation | Total |
|---------|------------|-------|
| OwnerProfile | 8 (disc) + 32 (owner) + 4+64 (name) + 1 (bump) | **109** |
| MedicalRecord | 8 + 32 (id) + **32 (owner)** + 4+50 (name) + 1 (age) + 1 (animal_type) + 4+50 (caretaker_name) + 4+20 (caretaker_phone) + 1 (bump) | **207** (was 175) |
| MedicalAppointment | unchanged | **132** |
| PetCheckin | unchanged | **82** |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Solana unit | `register_owner` creates PDA, duplicate reject; `pay_medical_appointment` auth check | Mocha/Chai via ts-mocha against solana-test-validator |
| Solana integration | Full flow: register owner → vet registers pet with owner → owner pays → non-owner rejected | Same test suite, sequential instruction calls |
| Go unit | OwnerProfileCreated decode, upsert, API handler | `testing` + testify mocks |
| Web-app unit | `useRole` hook returns correct role, role-gated rendering | Vitest + testing-library |

**Strict TDD**: Anchor tests must be written and pass BEFORE frontend changes.

## Migration / Rollout

Fresh deploy on localnet/devnet. Existing `MedicalRecord` accounts without `owner` field will fail deserialization — accept this and redeploy clean. No data migration. Rollback: revert Solana program to previous version, revert Go migration `002_roles.sql`, remove `useRole` and role gates from UI.
