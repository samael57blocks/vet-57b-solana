# Event Indexer Specification

## Purpose

Subscribe to Solana events and poll on-chain accounts, persist to PostgreSQL.

## Requirements

### Requirement: Event subscription

Subscribe via WebSocket to two event signatures:

- **MedicalRecordCreated**: id, name, age, animal_type, caretaker_name, caretaker_phone → upsert `pets`.
- **MedicalAppointmentCreated**: id, pet_id, date, time, appointment_value, paid_value → upsert `appointments`.

#### Scenario: Both events persisted

- GIVEN running indexer on Solana
- WHEN either event emits
- THEN indexer parses all fields and upserts correct table

#### Scenario: Malformed log skipped

- GIVEN log not matching either signature
- WHEN parsed
- THEN silently skipped, indexer continues

### Requirement: Periodic account polling

Poll `MedicalRecord`, `MedicalAppointment`, `PetCheckin` accounts and upsert into respective tables.

#### Scenario: Poll captures non-event changes

- GIVEN `pay_medical_appointment` updated `paid_value` (no event)
- WHEN polling interval elapses
- THEN updated `paid_value` is upserted

#### Scenario: Poll overlaps event

- GIVEN row already persisted via event
- WHEN polling fetches same account
- THEN upsert produces no duplicate or error

### Requirement: WebSocket reconnection

Exponential backoff: start 1s, double each retry, cap at max (default 60s).

#### Scenario: Disconnect and resume

- GIVEN active WebSocket
- WHEN connection drops
- THEN indexer backs off, reconnects, resumes subscriptions
