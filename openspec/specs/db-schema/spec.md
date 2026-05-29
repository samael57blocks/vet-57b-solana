# DB Schema Specification

## Purpose

PostgreSQL schema for off-chain indexed data.

## Requirements

### Requirement: Tables

`pets`: id (text PK), name, age (int), animal_type (text CHECK 'Dog'|'Cat'), caretaker_name, caretaker_phone, created_at. `appointments`: id (text PK), pet_id (text FK pets(id)), date (timestamptz), time (text), appointment_value (bigint), paid_value (bigint), created_at. `checkins`: id (text PK), pet_id (text FK pets(id)), checkin_time (timestamptz), created_at. All columns NOT NULL except PKs/FKs. created_at defaults to NOW(). Inserts SHALL `ON CONFLICT (id) DO UPDATE`.

#### Scenario: Tables created

- GIVEN empty database
- WHEN migrations run
- THEN all tables exist with correct columns

#### Scenario: Duplicate upserted

- GIVEN row id `X`
- WHEN indexer upserts id `X` again
- THEN row updates without error

#### Scenario: FK violation

- GIVEN no pet `Y`
- WHEN INSERT appointment with `pet_id = Y`
- THEN DB rejects with FK violation

### Requirement: Migrations

Migrations SHALL be versioned and idempotent on re-apply.

#### Scenario: Re-apply safe

- GIVEN migrated database
- WHEN migrations run again
- THEN no errors
