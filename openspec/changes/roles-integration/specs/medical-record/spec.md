# Delta for Medical Record

## ADDED Requirements

### Requirement: MedicalRecord MUST store the owner pubkey

The MedicalRecord account SHALL include an `owner: Pubkey` field identifying the pet owner (the wallet with an OwnerProfile). The existing PDA seeds SHALL NOT change. The `MedicalRecordCreated` event SHALL include the owner pubkey.

#### Scenario: Owner pubkey stored on registration

- GIVEN wallet `A` has an OwnerProfile with pubkey `OwnerA`
- WHEN a vet calls `register_pet` specifying `OwnerA` as the owner for pet ID `42`
- THEN the MedicalRecord SHALL contain `owner: OwnerA`
- AND the `MedicalRecordCreated` event SHALL include `owner: OwnerA`

## MODIFIED Requirements

### Requirement: Pet registration creates an on-chain medical record

The system MUST create a `MedicalRecord` account when a vet invokes `register_pet`. The account SHALL be a PDA derived from seeds `[b"medical-record", owner.key.as_ref(), pet_id.to_le_bytes()]`. The caller (vet, not owner) MUST sign the transaction. The MedicalRecord SHALL store the owner pubkey. Duplicate pet IDs for the same owner MUST NOT be allowed.
(Previously: Owner registered their own pet; no owner field in account)

#### Scenario: Happy path — pet registered by vet for owner

- GIVEN a wallet `Vet` with sufficient SOL
- WHEN the vet calls `register_pet` with pet name, species, breed, a unique pet ID, and an owner pubkey `OwnerA`
- THEN a `MedicalRecord` account is created at the derived PDA with `owner: OwnerA`
- AND a `MedicalRecordCreated` event is emitted with the pet ID, owner pubkey, and vet pubkey

#### Scenario: Duplicate pet ID for same owner rejected

- GIVEN an existing medical record for pet ID `42` owned by `OwnerA`
- WHEN any caller attempts `register_pet` with pet ID `42` and owner `OwnerA`
- THEN the transaction MUST fail with a custom Anchor error `PetAlreadyRegistered`

#### Scenario: Non-signer cannot register

- GIVEN wallet `Vet` exists
- WHEN wallet `B` (not the signer) attempts to register a pet
- THEN the Anchor account validation MUST reject the transaction
