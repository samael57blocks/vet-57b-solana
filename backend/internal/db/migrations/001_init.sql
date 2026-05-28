-- 001_init.sql
-- Initial schema for the vet-57b backend.
-- Creates 3 tables: pets, appointments, checkins.
--
-- Design decisions:
--   - All PKs are TEXT (base58-encoded Solana PubKeys).
--   - animal_type is constrained to 'Dog' | 'Cat' via CHECK.
--   - ON CONFLICT (id) DO UPDATE enables idempotent upsert for indexer usage.
--   - created_at defaults to NOW() for audit trail.
--   - Foreign keys cascade: if a pet is deleted, its appointments and checkins
--     are also removed (on-chain data is authoritative; we mirror it).
--
-- Idempotent: IF NOT EXISTS guards allow safe re-apply.

CREATE TABLE IF NOT EXISTS pets (
    id             TEXT        PRIMARY KEY,
    name           TEXT        NOT NULL,
    age            INTEGER     NOT NULL,
    animal_type    TEXT        NOT NULL CHECK (animal_type IN ('Dog', 'Cat')),
    caretaker_name TEXT        NOT NULL,
    caretaker_phone TEXT       NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id                TEXT        PRIMARY KEY,
    pet_id            TEXT        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    date              TIMESTAMPTZ NOT NULL,
    time              TEXT        NOT NULL,
    appointment_value BIGINT     NOT NULL,
    paid_value        BIGINT     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkins (
    id           TEXT        PRIMARY KEY,
    pet_id       TEXT        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    checkin_time TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns.
CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_checkins_pet_id ON checkins(pet_id);
