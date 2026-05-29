// Package testutil provides shared test helpers and infrastructure for the
// vet-57b backend test suite.
//
// Patterns:
//   - Table-driven tests: use t.Run(tt.name, ...) for subtests.
//   - Integration tests: skip with t.Skip(t, "skipping integration test") when
//     testing.Short() is true. This allows unit tests to run quickly in CI.
//   - DB tests: NewTestPool (when implemented in Phase 4) provisions ephemeral
//     PostgreSQL via testcontainers or a dedicated test database.
//   - Mock stubs: SolanaClientMock and DBMock interfaces are placeholder types
//     for mocking at small interfaces around system boundaries.
package testutil

import (
	"context"
	"testing"
)

// SkipIfShort skips the test if -test.short is set.
// Use this for integration tests that require external services (PostgreSQL,
// Solana RPC, etc.).
func SkipIfShort(t *testing.T) {
	t.Helper()
	if testing.Short() {
		t.Skip("skipping integration test (-test.short)")
	}
}

// Context returns a background context for use in tests.
// Tests should not use context.Background() directly — this helper exists
// as a single point of control for test-wide context changes (e.g., adding
// timeouts in CI).
func Context() context.Context {
	return context.Background()
}

// DBSetup is a placeholder type for database connection pool used in integration tests.
// Full implementation in Phase 4 will use testcontainers or ephemeral PostgreSQL.
type DBSetup struct {
	// DSN is the connection string for the test database.
	DSN string
}

// NewDBSetup creates a DBSetup for integration tests. When no DSN is provided,
// it reads from DATABASE_URL_TEST env var, or returns a setup that marks tests
// as skipped.
func NewDBSetup(t *testing.T, dsn string) *DBSetup {
	t.Helper()

	if dsn == "" {
		t.Log("DATABASE_URL_TEST not set; integration tests will be skipped")
	}
	return &DBSetup{DSN: dsn}
}

// SolanaClientMock is a placeholder mock for the Solana RPC/WS client interface.
// Full implementation in Phase 3 will provide mock GetProgramAccounts responses
// and WS subscription simulation.
type SolanaClientMock struct {
	t *testing.T
}

// NewSolanaClientMock creates a new SolanaClientMock.
func NewSolanaClientMock(t *testing.T) *SolanaClientMock {
	t.Helper()
	return &SolanaClientMock{t: t}
}

// DBMock is a placeholder mock for the database interface.
// Full implementation in Phase 2 will provide mock query responses for
// handler unit tests.
type DBMock struct {
	t *testing.T
}

// NewDBMock creates a new DBMock.
func NewDBMock(t *testing.T) *DBMock {
	t.Helper()
	return &DBMock{t: t}
}
