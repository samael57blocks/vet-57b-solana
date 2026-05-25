# Tasks: Change 1 — Solana Program + TS Client + Tests

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~560–620 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Rust core → PR 2: TS client → PR 3: Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Solana program (lib.rs) — accounts, handlers, events, errors | PR 1 | Base = main; standalone compilable, no runtime deps |
| 2 | TS Client — typed wrapper + PDA helpers in all models | PR 2 | Base = main; needs IDL from PR 1 build to type-check |
| 3 | Test helpers + 4 test suites | PR 3 | Base = main; depends on PR 1/2 for IDL + models |

## Phase 1: Solana Program (Rust)

- [x] 1.1 Add `AnimalType` unit enum + `Vet57bError` codes (`DuplicateMedicalRecord`, `AppointmentAlreadyExists`, `PaymentExceedsCost`, `CheckinAlreadyExists`, `MedicalRecordNotFound`)
- [x] 1.2 Add `MedicalRecord` account struct + `RegisterPet` input struct + `RegisterPetAccounts` validation; implement `register_pet` handler emitting `MedicalRecordCreated`
- [x] 1.3 Add `MedicalAppointment` account struct + `ScheduleAppointment` input struct + accounts validation; implement `schedule_medical_appointment` handler emitting `MedicalAppointmentCreated`
- [x] 1.4 Add `PayAppointment` input struct + accounts validation; implement `pay_medical_appointment` with partial/full payment logic and overpayment check
- [x] 1.5 Add `PetCheckin` account struct + `TakePetToVet` input struct + accounts validation; implement `take_pet_to_vet` handler recording checkin timestamp
- [x] 1.6 Remove `MockContext` struct; update `rust-toolchain.toml` nightly version to align with build script

## Phase 2: TS Client (Models + Wrapper)

- [x] 2.1 Fix `AnimalType` enum keys in `medical_record.model.ts` to match Anchor IDL variant names — use lowercase `dog`/`cat` keys as Anchor 0.32.x `convertIdlToCamelCase` lowercases variant names
- [x] 2.2 Implement `MedicalRecord.deriveAddress()` via `findProgramAddressSync([b"medical-record", id])`
- [x] 2.3 Implement `MedicalAppointment.deriveAddress()` via `findProgramAddressSync([b"medical-appointment", id])`
- [x] 2.4 Create `pet_checkin.model.ts` with `PetCheckin` interface + `deriveAddress([b"pet-checkin", medical_record, id])`
- [x] 2.5 Create `vet.program.ts` with typed `Program<Vet57b>` wrapper exposing methods for all 4 instructions

## Phase 3: Test Helpers

- [x] 3.1 Fix `testing_context.helper.ts`: replace `anchor.workspace.Vet57b` with `import * as anchor from "@coral-xyz/anchor"` + program init via `AnchorProvider.local()`; also fixed airdrop confirmation
- [x] 3.2 Add `medical_appointment.helper.ts` data mother (`givenNewMedicalAppointment`)
- [x] 3.3 Add `pet_checkin.helper.ts` data mother (`givenNewPetCheckin`)
- [x] 3.4 Update `data_mothers/index.ts` to export both new helpers

## Phase 4: Test Suites

- [x] 4.1 Wire real accounts in `medical_record.spec.ts`: happy path test passes; event assertion fixed; account assertion fixed
- [ ] 4.2 Create `schedule_appointment.spec.ts`: happy path, unregistered pet rejection, duplicate ID rejection
- [ ] 4.3 Create `pay_appointment.spec.ts`: full payment, partial payment, overpayment error
- [ ] 4.4 Create `pet_checkin.spec.ts`: happy path with timestamp check, unregistered pet, duplicate ID
