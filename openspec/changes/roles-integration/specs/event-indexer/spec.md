# Delta for Event Indexer

## ADDED Requirements

### Requirement: OwnerProfileCreated event handler

The indexer MUST subscribe to `OwnerProfileCreated` events. On receipt, it SHALL parse the owner pubkey and name, then upsert into the `owner_profiles` table.

#### Scenario: OwnerProfileCreated persists to DB

- GIVEN a running indexer
- WHEN an `OwnerProfileCreated` event emits with pubkey `ABC` and name "Alice"
- THEN the indexer SHALL upsert `{ pubkey: "ABC", name: "Alice" }` into `owner_profiles`

## MODIFIED Requirements

### Requirement: Event subscription

Subscribe via WebSocket to three event signatures:

- **MedicalRecordCreated**: id, name, age, animal_type, caretaker_name, caretaker_phone, **owner** → upsert `pets` with `owner_id`.
- **MedicalAppointmentCreated**: id, pet_id, date, time, appointment_value, paid_value → upsert `appointments`.
- **OwnerProfileCreated**: pubkey, name → upsert `owner_profiles`.

(Previously: Only MedicalRecordCreated and MedicalAppointmentCreated; no owner field)

#### Scenario: MedicalRecordCreated includes owner

- GIVEN running indexer on Solana
- WHEN a `MedicalRecordCreated` event emits with `owner: "ABC"`
- THEN the `pets` row SHALL include `owner_id = "ABC"`

#### Scenario: OwnerProfileCreated persisted

- GIVEN running indexer on Solana
- WHEN an `OwnerProfileCreated` event emits
- THEN indexer parses pubkey and name, upserts into `owner_profiles`

#### Scenario: Malformed log skipped

- GIVEN log not matching any known signature
- WHEN parsed
- THEN silently skipped, indexer continues
