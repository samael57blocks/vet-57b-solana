# Proposal: Roles Integration — Owner & Vet Separation

## Intent

Introduce `OwnerProfile` PDA to distinguish owners (can pay, see own pets) from vets (register pets, schedule). Wallets with an OwnerProfile are owners; wallets without are vets. Only owners can pay.

## Scope

### In Scope
- `owner` field on MedicalRecord + event
- OwnerProfile PDA (seeds `[b"owner-profile", owner.key]`) — stores owner wallet + name
- `register_owner` instruction + event
- `authority == record.owner` check in pay
- Vet = wallet w/o OwnerProfile (MVP)
- Wallet-based signer in VetProgram
- Role-gated UI, owner signup flow
- **Pet registration form**: dropdown listing all registered owners to assign the pet
- Go: owner_id, owner_profiles table, role filters
- Indexer: handle OwnerProfileCreated, owner in MedicalRecordCreated

### Out of Scope
- On-chain vet profile, RBAC beyond owner/vet
- Admin panel, data migration

## Capabilities

### New Capabilities
- `owner-profile`: Owner registration via OwnerProfile PDA

### Modified Capabilities
- `medical-record`: Add owner field, vet as registrar
- `medical-appointment`: Owner-only payment
- `pet-registration-ui`: Role-aware (vet registers, owner profiles, dropdown selector)
- `pet-list-ui`: Role-filtered
- `appointment-management-ui`: Vet schedules, owner pays
- `wallet-infrastructure`: OwnerProfile detection + role context
- `rest-api`: owner_id in pets, owner profile endpoint
- `event-indexer`: owner in MedicalRecordCreated, OwnerProfileCreated
- `db-schema`: owner_id column, owner_profiles table

## Approach

1. **Solana**: OwnerProfile account, register_owner, owner field, auth check. Keep seeds.
2. **TS Client**: registerOwner, wallet signer, model updates.
3. **Go**: Migration, OwnerProfileCreated handler, owner endpoint, filters.
4. **Web-app**: useRole hook, role-gated views, owner signup.

## Affected Areas

| Area | Impact | Summary |
|------|--------|---------|
| `solana/.../lib.rs` | Modified | OwnerProfile, owner field, auth check |
| `solana/app/vet.program.ts` | Modified | registerOwner, wallet signer |
| `solana/app/models/` | Modified | +OwnerProfile, owner field |
| `backend/internal/db/` | New | migration |
| `backend/internal/api/` | Modified | owner endpoint, role filters |
| `backend/internal/listener/` | Modified | OwnerProfileCreated handler |
| `backend/internal/models/` | Modified | +OwnerProfile |
| `web-app/src/` | Modified | useRole, role views, signup |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing records lack owner | High | Redeploy |
| "Why can't I pay?" | Medium | UI explainer |
| Wallet is both owner and vet | Low | Both allowed |

## Rollback

Revert Solana + redeploy. Revert Go migrations. Revert UI to flat role-less.

## Dependencies

Anchor v0.32. @coral-xyz/anchor ^0.30.1. No external changes.

## Success Criteria

- [ ] `OwnerProfile` created via `register_owner`
- [ ] Non-owner `pay_medical_appointment` fails
- [ ] Vet sees all pets; owner sees only `owner == wallet`
- [ ] Owner registration UI shows when no OwnerProfile
- [ ] Go stores `owner_id`, exposes `GET /api/v1/owners/:pubkey/profile`
- [ ] Solana tests (ts-mocha) and web-app tests (vitest) pass
