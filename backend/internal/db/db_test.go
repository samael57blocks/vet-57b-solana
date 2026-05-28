// Package db integration tests.
//
// These tests require a running PostgreSQL instance accessible via the
// DATABASE_URL_TEST environment variable. They are skippable with -test.short
// (the SkipIfShort helper is applied).
//
// The test database MUST be disposable — tables are dropped after each test
// via DROP TABLE IF EXISTS cleanup.
package db

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/testutil"
	"github.com/jackc/pgx/v5/pgxpool"
)

// migrationsDir is the path to SQL migration files relative to this package.
// When running go test ./internal/db/, the working directory is the package
// directory, so "migrations" resolves to internal/db/migrations/.
const migrationsDir = "migrations"

// testDSN returns the test database connection string from DATABASE_URL_TEST,
// or skips the test if not set.
func testDSN(t *testing.T) string {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL_TEST")
	if dsn == "" {
		t.Skip("DATABASE_URL_TEST not set; skipping integration test")
	}
	return dsn
}

// testPool creates a new pool using the test DSN and returns it.
// The pool is automatically closed at test end via t.Cleanup.
func testPool(t *testing.T, ctx context.Context) *pgxpool.Pool {
	t.Helper()
	dsn := testDSN(t)
	pool, err := Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("Connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

// cleanupTables drops all three tables so the next test starts clean.
func cleanupTables(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `DROP TABLE IF EXISTS checkins CASCADE`); err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, `DROP TABLE IF EXISTS appointments CASCADE`); err != nil {
		return err
	}
	if _, err := pool.Exec(ctx, `DROP TABLE IF EXISTS pets CASCADE`); err != nil {
		return err
	}
	return nil
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// TestMigrationsIdempotent verifies that running RunMigrations twice succeeds
// (the SQL is written with IF NOT EXISTS so re-apply is safe).
func TestMigrationsIdempotent(t *testing.T) {
	testutil.SkipIfShort(t)
	ctx := context.Background()

	pool := testPool(t, ctx)

	// Start clean.
	if err := cleanupTables(ctx, pool); err != nil {
		t.Fatalf("cleanup before: %v", err)
	}

	// First apply — should create all tables and indexes.
	if err := RunMigrations(ctx, pool, migrationsDir); err != nil {
		t.Fatalf("first migration run: %v", err)
	}

	// Verify tables exist after the first run.
	assertTableExists(t, ctx, pool, "pets")
	assertTableExists(t, ctx, pool, "appointments")
	assertTableExists(t, ctx, pool, "checkins")

	// Second apply — must be idempotent (no error).
	if err := RunMigrations(ctx, pool, migrationsDir); err != nil {
		t.Fatalf("second migration run (should be idempotent): %v", err)
	}

	// Tables still exist after re-apply.
	assertTableExists(t, ctx, pool, "pets")
	assertTableExists(t, ctx, pool, "appointments")
	assertTableExists(t, ctx, pool, "checkins")
}

// TestFKViolation verifies that inserting an appointment without a matching
// pet row raises a foreign key violation error.
func TestFKViolation(t *testing.T) {
	testutil.SkipIfShort(t)
	ctx := context.Background()

	pool := testPool(t, ctx)

	// Ensure tables exist (clean slate).
	if err := cleanupTables(ctx, pool); err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	if err := RunMigrations(ctx, pool, migrationsDir); err != nil {
		t.Fatalf("migration: %v", err)
	}

	// Attempt to insert an appointment referencing a non-existent pet.
	_, err := pool.Exec(ctx, `
		INSERT INTO appointments (id, pet_id, date, time, appointment_value, paid_value)
		VALUES ($1, $2, $3, $4, $5, $6)
	`,
		"nonexistent-appt",
		"nonexistent-pet",
		time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC),
		"10:00",
		100_000_000, // 0.1 SOL in lamports
		50_000_000,  // 0.05 SOL
	)

	// Must fail with a FK violation.
	if err == nil {
		t.Fatal("expected foreign key violation error, got nil")
	}

	errMsg := err.Error()
	if !strings.Contains(errMsg, "foreign key") &&
		!strings.Contains(errMsg, "violates foreign key") &&
		!strings.Contains(errMsg, "23503") {
		t.Fatalf("unexpected error (wanted FK violation): %v", err)
	}
}

// TestUpsertIdempotent verifies that inserting the same pet record twice
// succeeds (ON CONFLICT DO UPDATE makes upserts idempotent).
func TestUpsertIdempotent(t *testing.T) {
	testutil.SkipIfShort(t)
	ctx := context.Background()

	pool := testPool(t, ctx)

	// Ensure tables exist (clean slate).
	if err := cleanupTables(ctx, pool); err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	if err := RunMigrations(ctx, pool, migrationsDir); err != nil {
		t.Fatalf("migration: %v", err)
	}

	// First insert.
	_, err := pool.Exec(ctx, `
		INSERT INTO pets (id, name, age, animal_type, caretaker_name, caretaker_phone)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			age = EXCLUDED.age,
			animal_type = EXCLUDED.animal_type,
			caretaker_name = EXCLUDED.caretaker_name,
			caretaker_phone = EXCLUDED.caretaker_phone
	`,
		"pet-upsert",
		"Buddy",
		3,
		"Dog",
		"Alice",
		"+1-555-0100",
	)
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}

	// Second insert with same ID but different data — must succeed and update.
	_, err = pool.Exec(ctx, `
		INSERT INTO pets (id, name, age, animal_type, caretaker_name, caretaker_phone)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			age = EXCLUDED.age,
			animal_type = EXCLUDED.animal_type,
			caretaker_name = EXCLUDED.caretaker_name,
			caretaker_phone = EXCLUDED.caretaker_phone
	`,
		"pet-upsert",
		"Buddy Updated",
		4,
		"Dog",
		"Alice",
		"+1-555-0101",
	)
	if err != nil {
		t.Fatalf("second upsert (should be idempotent): %v", err)
	}

	// Verify the row was updated.
	var name string
	var age int
	err = pool.QueryRow(ctx, `SELECT name, age FROM pets WHERE id = $1`, "pet-upsert").Scan(&name, &age)
	if err != nil {
		t.Fatalf("query updated pet: %v", err)
	}
	if name != "Buddy Updated" {
		t.Errorf("expected name 'Buddy Updated', got %q", name)
	}
	if age != 4 {
		t.Errorf("expected age 4, got %d", age)
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// assertTableExists checks whether a table exists in the public schema.
func assertTableExists(t *testing.T, ctx context.Context, pool *pgxpool.Pool, tableName string) {
	t.Helper()
	var exists bool
	err := pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = $1
		)
	`, tableName).Scan(&exists)
	if err != nil {
		t.Fatalf("check table %s existence: %v", tableName, err)
	}
	if !exists {
		t.Fatalf("table %q should exist after migration", tableName)
	}
}
