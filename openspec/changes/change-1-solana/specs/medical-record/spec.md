# Medical Record Specification

## Purpose

Pet owners register their pets and create on-chain medical records. Each record is a PDA derived from the owner's wallet and a pet identifier, ensuring ownership and preventing duplicates.

## Requirements

### Requirement: Pet registration creates an on-chain medical record

The system MUST create a `MedicalRecord` account when a pet owner invokes `register_pet`. The account SHALL be a PDA derived from seeds `[b"medical-record", owner.key.as_ref(), pet_id.to_le_bytes()]`. The owner MUST sign the transaction. Duplicate pet IDs for the same owner MUST NOT be allowed.

#### Scenario: Happy path — pet registered successfully

- GIVEN a wallet with sufficient SOL
- WHEN the owner calls `register_pet` with pet name, species, breed, and a unique pet ID
- THEN a `MedicalRecord` account is created at the derived PDA
- AND a `MedicalRecordCreated` event is emitted with the pet ID and owner pubkey

#### Scenario: Duplicate pet ID rejected

- GIVEN an existing medical record for pet ID `42` owned by wallet `A`
- WHEN wallet `A` calls `register_pet` again with pet ID `42`
- THEN the transaction MUST fail with a custom Anchor error `PetAlreadyRegistered`

#### Scenario: Non-owner cannot register

- GIVEN wallet `A` exists
- WHEN wallet `B` (not the owner) attempts to register a pet under wallet `A`'s identity
- THEN the Anchor account validation MUST reject the transaction

### Requirement: Medical records store pet information

Each `MedicalRecord` account MUST store the pet's name, species, breed, and a unique numeric pet ID. The account SHALL use explicitly calculated space to accommodate these fields.

#### Scenario: Read pet data after registration

- GIVEN a successful `register_pet` transaction for pet ID `42`
- WHEN a client fetches the `MedicalRecord` account at the derived PDA
- THEN the account data SHALL contain the name, species, breed, and pet ID as stored
