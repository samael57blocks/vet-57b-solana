# Delta for DB Schema

## ADDED Requirements

### Requirement: owner_profiles table

The DB MUST include an `owner_profiles` table: `pubkey` (text PK), `name` (text, NOT NULL), `created_at` (timestamptz, default NOW()). Index on `name` SHOULD be created for dropdown lookups.

#### Scenario: owner_profiles table created

- GIVEN empty database
- WHEN migrations run
- THEN `owner_profiles` table exists with columns `pubkey`, `name`, `created_at`

#### Scenario: Duplicate owner upserted

- GIVEN row `pubkey = "ABC"` exists
- WHEN indexer upserts `pubkey = "ABC"` again
- THEN row updates without error

## MODIFIED Requirements

### Requirement: Tables

`pets`: id (text PK), name, age (int), animal_type (text CHECK 'Dog'|'Cat'), caretaker_name, caretaker_phone, **owner_id** (text FK owner_profiles(pubkey), nullable), created_at. `appointments`: id (text PK), pet_id (text FK pets(id)), date (timestamptz), time (text), appointment_value (bigint), paid_value (bigint), created_at. `checkins`: id (text PK), pet_id (text FK pets(id)), checkin_time (timestamptz), created_at. `owner_profiles`: pubkey (text PK), name (text), created_at (timestamptz). All columns NOT NULL except PKs/FKs. created_at defaults to NOW(). Inserts SHALL `ON CONFLICT (id) DO UPDATE`.
(Previously: pets table had no owner_id; no owner_profiles table)

#### Scenario: pets table includes owner_id

- GIVEN migrated database
- WHEN inspecting `pets` table schema
- THEN `owner_id` column exists as nullable FK to `owner_profiles(pubkey)`

#### Scenario: FK violation for owner_id

- GIVEN no owner `XYZ`
- WHEN INSERT into `pets` with `owner_id = XYZ`
- THEN DB rejects with FK violation
