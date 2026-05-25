# Proposal: Solana Program + TS Client + Tests

## Intent

Replace MockContext scaffold with a real Anchor program. Without accounts, events, and errors, no frontend or backend can interact with the chain. This is the foundation for the entire dapp.

## Scope

### In Scope
- Rust program: account structs with PDA validation, 4 instruction handlers, 2 events, custom error codes
- TS client: PDA derivation helpers, typed program wrapper (`vet.program.ts`), model fixes
- Tests: 4 integration suites (register_pet, schedule, pay, take_pet_to_vet) using Mocha/Chai
- Fix Anchor version skew (0.32.1 Rust / ^0.30.1 TS), toolchain alignment, broken testing_context import, missing anchor namespace

### Out of Scope
- Web-app React frontend
- Backend
- AnimalType enum normalization across codebases (tracked separately)
- CI/CD or coverage tooling

## Capabilities

### New Capabilities
- **medical-record**: Pet registration, medical record creation with PDA-based addressing and owner validation
- **medical-appointment**: Appointment scheduling and partial/full payment tracking
- **pet-checkin**: Pet arrival check-in recording with timestamp

### Modified Capabilities
None — greenfield program.

## Approach

Implement 3 Anchor account structs (MedicalRecord, MedicalAppointment, PetCheckin), 4 instruction handlers, 2 events (MedicalRecordCreated, MedicalAppointmentCreated), and a custom error enum. Accounts use `#[seeds()]` for deterministic PDA derivation. Wire PDA helpers into existing TS models. Fix testing_context to import `anchor` namespace. Align toolchain and Anchor versions in `Cargo.toml` and `Anchor.toml`.

## Affected Areas

| Area | Impact |
|------|--------|
| `solana/programs/vet-57b/src/lib.rs` | Modified — real accounts, events, errors |
| `solana/app/vet.program.ts` | New — typed program wrapper |
| `solana/app/models/medical_record.model.ts` | Modified — PDA derivation, AnimalType |
| `solana/app/models/medical_appointment.model.ts` | Modified — PDA derivation |
| `solana/tests/medical_record.spec.ts` | Modified — unbreak imports |
| `solana/tests/helpers/testing_context.helper.ts` | Modified — fix anchor namespace |
| `solana/Anchor.toml`, `solana/rust-toolchain.toml`, `solana/Cargo.toml` | Modified — version alignment |
| `solana/tests/` | New — 3 additional test suites |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Version mismatch breaks build | Low | Pin exact versions in manifests |
| Event parsing in tests broken | Med | Validate getEvent helper with known event first |
| Test validator unavailable | Med | `anchor test` auto-installs it |

## Rollback Plan

Revert commit. Program ID stays unchanged; MockContext remains valid for local dev. If deployed, deploy prior build.

## Dependencies

- Anchor CLI 0.32.1
- Rust nightly toolchain (single version across project)
- solana-test-validator (auto-installed by anchor test)

## Success Criteria

- [ ] `anchor test` passes all 4 instruction suites
- [ ] Events emitted correctly for create instructions and parseable via getEvent helper
- [ ] Custom Anchor errors returned for invalid inputs (e.g., duplicate record, insufficient payment)
- [ ] TS client derives all PDA addresses matching Rust seeds
- [ ] 0 Anchor build warnings
