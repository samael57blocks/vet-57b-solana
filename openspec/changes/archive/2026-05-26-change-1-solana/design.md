# Design: Change 1 — Solana Program + TS Client + Tests

## Technical Approach

Replace 4 MockContext stubs with 3 Anchor account structs (MedicalRecord, MedicalAppointment, PetCheckin), 4 validated instruction handlers, 2 events, and a custom error enum. TS client wraps the typed program and implements PDA helpers. 4 integration test suites verify full instruction lifecycle.

## Architecture Decisions

| Decision | Option | Tradeoff | Chosen |
|----------|--------|----------|--------|
| Instruction args | Flat positional vs packed `#[derive(AnchorSerialize)]` input struct | Flat = verbose calls (20+ params), struct = cleaner TS + single Borsh object | **Input struct** — matches existing `registerPet(newMedicalRecord)` test pattern |
| PDA seeds | Counter-based vs static prefix + user key | Counter = needs on-chain read for derivation, prefix = fully offline | **Static prefix** — `[b"medical-record", id.as_ref()]` for MedicalRecord/Appointment, `[b"pet-checkin", medical_record.as_ref(), checkin_time.le_bytes()]` for PetCheckin |
| AnimalType | String enum vs unit enum | String = readable logs but wasteful, unit = efficient but requires name matching | **Unit enum** — Borsh 1-byte variant index, matches Anchor IDL convention |
| Error handling | `panic!` vs `#[error_code]` | panic = no graceful recovery, error_code = typed AnchorErrors | **Error codes** — `DuplicateMedicalRecord`, `MedicalRecordNotFound`, `AppointmentAlreadyPaid`, `InvalidPaymentAmount` |

## Data Flow

```
Wallet → program.methods.<instruction>(input)
              │
              ▼
   #[derive(Accounts)] ← PDA seeds validated via seeds constraint
              │
              ▼
   handler → read/write account data → emit event
              │
              ▼
   TS getEvent(tx) parses event from logs
```

## Account Structs (Rust)

```rust
#[account]
pub struct MedicalRecord {
    pub id: Pubkey, pub name: String, pub age: u8,
    pub animal_type: AnimalType, pub caretaker_name: String,
    pub caretaker_phone: String, pub bump: u8,
}

#[account]
pub struct MedicalAppointment {
    pub id: Pubkey, pub medical_record: Pubkey, pub date: i64,
    pub time: String, pub appointment_value: u64,
    pub paid_value: u64, pub bump: u8,
}

#[account]
pub struct PetCheckin {
    pub id: Pubkey, pub medical_record: Pubkey,
    pub checkin_time: i64, pub bump: u8,
}
```

## PDA Seeds

| Account | Seeds |
|---------|-------|
| MedicalRecord | `[b"medical-record", id.as_ref()]` |
| MedicalAppointment | `[b"medical-appointment", id.as_ref()]` |
| PetCheckin | `[b"pet-checkin", medical_record.as_ref(), checkin_time.to_le_bytes().as_ref()]` |

## Instruction Contexts

| Instruction | Accounts |
|-------------|----------|
| `register_pet` | `authority (Signer)` + `medical_record (init, seeds)` + `system_program` |
| `schedule` | `authority (Signer)` + `medical_record` + `medical_appointment (init, seeds)` + `system_program` |
| `pay` | `authority (Signer)` + `medical_appointment (mut)` |
| `take_pet_to_vet` | `authority (Signer)` + `medical_record` + `pet_checkin (init, seeds)` + `system_program` |

## Events

```rust
#[event] pub struct MedicalRecordCreated { pub id: Pubkey, pub name: String, pub age: u8, pub animal_type: AnimalType, pub caretaker_name: String, pub caretaker_phone: String }
#[event] pub struct MedicalAppointmentCreated { pub id: Pubkey, pub pet_id: Pubkey, pub date: i64, pub time: String, pub appointment_value: u64, pub paid_value: u64 }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `solana/programs/vet-57b/src/lib.rs` | Modify | Accounts, handlers, events, errors |
| `solana/app/vet.program.ts` | Modify | Typed program wrapper + PDA helpers |
| `solana/app/models/medical_record.model.ts` | Modify | `deriveAddress` impl, fix AnimalType enum names |
| `solana/app/models/medical_appointment.model.ts` | Modify | Add `deriveAddress` static method |
| `solana/app/models/pet_checkin.model.ts` | Create | Model + PDA derivation |
| `solana/tests/helpers/testing_context.helper.ts` | Modify | Fix `anchor.workspace` → `import * as anchor` |
| `solana/tests/medical_record.spec.ts` | Modify | Wire real accounts |
| `solana/tests/schedule_appointment.spec.ts` | Create | Appointment suite |
| `solana/tests/pay_appointment.spec.ts` | Create | Payment suite |
| `solana/tests/pet_checkin.spec.ts` | Create | Checkin suite |
| `solana/tests/helpers/data_mothers/` | Modify | Add appointment + checkin mothers |
| `solana/rust-toolchain.toml` | Modify | Align nightly to match build script |

## Testing Strategy

| Test | Coverage | Approach |
|------|----------|----------|
| `medical_record.spec.ts` | register_pet — create, read, event parse | PDA derive → confirm fields → `getEvent` |
| `schedule_appointment.spec.ts` | schedule — create, event parse | Same pattern, include MedicalRecord as read-only |
| `pay_appointment.spec.ts` | partial payment, full payment, error on zero | Read `paid_value` before/after, expect AnchorError |
| `pet_checkin.spec.ts` | take_pet_to_vet — create, timestamp check | Verify PDA with medical_record + time seeds |

Negative tests for duplicate PDA and unauthorized signer included per suite.

## Open Questions

- [ ] AnimalType enum variant naming: TS has `DOG` (uppercase key), Rust uses `Dog` (title case) — must align TS enum keys to match Anchor IDL variant names (`Dog`, `Cat`)
