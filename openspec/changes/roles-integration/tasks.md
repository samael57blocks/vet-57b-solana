# Tasks: Roles Integration — Owner & Vet Separation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Solana (program + TS models + tests) → PR 2: Go backend → PR 3: Web-app UI |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Solana program + TS models + tests | PR 1 | base=feature/roles-integration (tracker); TDD-first, anchor + ts-mocha |
| 2 | Go backend: migration, models, handlers, listener | PR 2 | base=PR #1 branch; depends on program deployed |
| 3 | Web-app: hooks, context, pages, role gates | PR 3 | base=PR #2 branch; depends on program deployed |

## Phase 1: Solana Program + Tests (Strict TDD)

- [x] [anchor] [RED] 1.1 Write failing test `owner_profile.spec.ts` — `register_owner` happy path + duplicate reject
- [x] [anchor] [RED] 1.2 Write failing test `pay_appointment.spec.ts` — non-owner rejection
- [x] [anchor] [RED] 1.3 Update `medical_record.spec.ts` — owner field in `register_pet` call
- [x] [anchor] 1.4 Add `OwnerProfile` account struct + `register_owner` instruction + `OwnerProfileCreated` event
- [x] [anchor] 1.5 Add `owner: Pubkey` to `MedicalRecord`, update `MedicalRecordCreated` event
- [x] [anchor] 1.6 Update `register_pet` — accept `owner` param (seeds unchanged per design decision)
- [x] [anchor] 1.7 Add `medical_record` to `pay_medical_appointment` accounts; validate `authority == record.owner`
- [x] [anchor] 1.8 Update account space constants: `OwnerProfile` 109, `MedicalRecord` 207
- [x] [anchor] [GREEN] 1.9 Run `ts-mocha` — all TDD scenarios pass (14/14)

## Phase 2: TS Client Models

- 2.1 Create `owner_profile.model.ts` — interface + static `deriveAddress()`
- 2.2 Create `owner_profile_created.model.ts` event interface
- 2.3 Update `medical_record.model.ts` — add `owner: PublicKey`
- 2.4 Update `medical_record_created.model.ts` — add `owner: PublicKey`
- 2.5 Export new models from `models/index.ts`
- 2.6 Update `vet.program.ts` — add `registerOwner()` method

## Phase 3: Go Backend

- 3.1 Create `002_roles.sql` migration — `owner_profiles` table + `owner_id` on `pets`
- 3.2 Add `OwnerProfile` struct + `OwnerID` to `Pet` in `models.go`
- 3.3 Add `UpsertOwnerProfile`, `GetOwnerProfile`, `ListPets(ownerId)` queries + eventstore
- 3.4 Create `owners.go` handler — `GET /api/v1/owners/:pubkey/profile`
- 3.5 Mount `/owners` route in `router.go`
- 3.6 Add `OwnerProfileCreated` discriminator in `discriminators.go`
- 3.7 Handle new event in `websocket.go` + bridge in `dbadapter.go`
- 3.8 Run `go test ./...` — all pass

## Phase 4: Web-app UI

- 4.1 Create `useRole.ts` hook — fetches OwnerProfile, returns `{ role, ownerProfile }`
- 4.2 Create `useRoleContext.tsx` — role provider + consumer
- 4.3 Create `OwnerSignup.tsx` — name input + register_owner call
- 4.4 Update `PetRegistrationForm.tsx` — role gate + owner dropdown selector
- 4.5 Update `PetsOverview.tsx` — role-filtered list (owner sees own, vet sees all)
- 4.6 Update `AppointmentForm.tsx` — vet-only gate
- 4.7 Update `AppointmentList.tsx` — Pay button only for owner + appointment owner match
- 4.8 Update `router.tsx` — add `/owner-signup` route
- 4.9 Run `npm run test` + `npm run build` — all pass
