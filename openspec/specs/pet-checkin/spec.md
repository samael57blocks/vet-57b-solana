# Pet Check-in Specification

## Purpose

When a pet arrives at the clinic, a check-in is recorded with an on-chain timestamp. This provides an immutable arrival log linked to the pet's medical record.

## Requirements

### Requirement: Register pet arrival at clinic

The system MUST create a `PetCheckin` account when `take_pet_to_vet` is invoked. The account SHALL be a PDA derived from seeds `[b"pet-checkin", record.key.as_ref(), checkin_id.to_le_bytes()]`. The current slot timestamp MUST be recorded. The caller MUST provide a valid `MedicalRecord` PDA.

#### Scenario: Happy path — check-in recorded

- GIVEN a registered medical record for pet ID `42`
- WHEN the owner calls `take_pet_to_vet` with a unique check-in ID
- THEN a `PetCheckin` account is created at the derived PDA
- AND the account SHALL contain a timestamp corresponding to the slot

#### Scenario: Check-in for unregistered pet rejected

- GIVEN no medical record exists for pet ID `99`
- WHEN any wallet calls `take_pet_to_vet` referencing pet ID `99`
- THEN the transaction MUST fail because the referenced `MedicalRecord` account does not exist

#### Scenario: Duplicate check-in ID rejected

- GIVEN an existing check-in with ID `1` for a given medical record
- WHEN the owner calls `take_pet_to_vet` with check-in ID `1` for the same record
- THEN the transaction MUST fail with `CheckinAlreadyExists`
