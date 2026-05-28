# Apply Progress: Go Backend — PR 1 (Foundation)

## Change
`go-backend` — Phase 1 Foundation (PR 1 of 4)

## Mode
Standard — No Strict TDD (Go module has no pre-configured test runner; test infra is scaffolded in 1.7)

## Delivery
- Chain strategy: `feature-branch-chain`
- This PR targets the feature/tracker branch, not main
- Estimated ~280 lines (within 400-line budget)

## Completed Tasks

### 1.1 Init Go module
- **File**: `backend/go.mod`, `backend/go.sum`
- **What**: `go mod init github.com/57blocks/vet-57b-backend`
- **Deps added**: `github.com/jackc/pgx/v5 v5.7.2` (direct), `github.com/go-chi/chi/v5 v5.2.1` (resolved via `go get`; will become direct in Phase 2)
- **Note**: solana-go dep deferred to Phase 3 when its import is needed

### 1.2 Config struct
- **File**: `backend/internal/config/config.go`
- **What**: `Config` struct with 7 env-based fields, `Parse()` function, `String()` with DSN redaction
- **Env vars**: `SOLANA_RPC_URL`, `SOLANA_WS_URL`, `PROGRAM_ID`, `DATABASE_URL`, `LISTEN_ADDR`, `POLL_INTERVAL`, `WS_MAX_BACKOFF`
- **Pattern**: 12-factor app, no config files

### 1.3 Go structs/models
- **File**: `backend/internal/models/models.go`
- **What**: `Pet`, `Appointment`, `Checkin` structs with JSON tags
- **Maps**: Anchor `MedicalRecord` → `Pet`, `MedicalAppointment` → `Appointment`, `PetCheckin` → `Checkin`
- **Differences from Anchor**: PubKeys stored as `string` (base58), added `CreatedAt time.Time`, `AnimalType` is `string` not enum

### 1.4 SQL migration
- **File**: `backend/internal/db/migrations/001_init.sql`
- **Tables**: `pets`, `appointments`, `checkins`
- **Features**: FK with CASCADE, `CHECK (animal_type IN ('Dog', 'Cat'))`, `ON CONFLICT (id) DO UPDATE` semantics, indexes on `pet_id`, `IF NOT EXISTS` for idempotency

### 1.5 DB layer
- **File**: `backend/internal/db/db.go`
- **What**: `Connect()` creates pgxpool (10 max / 2 min conns), `RunMigrations()` reads and executes .sql files sorted by name
- **Pattern**: Pool-based, not tx-wrapped per migration (each file is its own implicit tx)

### 1.6 Dockerfile
- **File**: `backend/Dockerfile`
- **Stages**: `golang:1.23-alpine` build → `alpine:3.20` runtime
- **Features**: Multi-stage, non-root user, HEALTHCHECK, tzdata + ca-certificates in runtime

### 1.7 Test infra
- **File**: `backend/internal/testutil/testutil.go`
- **What**: `SkipIfShort()`, `Context()`, placeholder `DBSetup`, `SolanaClientMock`, `DBMock` types
- **Pattern**: Table-driven tests, `testing.Short()` guard for integration tests, mock stubs at interface boundaries

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/go.mod` | Created | Go module definition with pgx v5 + chi |
| `backend/go.sum` | Created | Dependency lock file |
| `backend/internal/config/config.go` | Created | Environment-based configuration |
| `backend/internal/models/models.go` | Created | Pet, Appointment, Checkin structs |
| `backend/internal/db/migrations/001_init.sql` | Created | 3 tables with FK, upsert, indexes |
| `backend/internal/db/db.go` | Created | pgxpool setup + migration runner |
| `backend/Dockerfile` | Created | Multi-stage Go build |
| `backend/internal/testutil/testutil.go` | Created | Test helpers, placeholders for mocks |
| `openspec/changes/go-backend/tasks.md` | Modified | Marked Phase 1 tasks [x], updated chain strategy |

## Deviations from Design
None — implementation matches design.md.

## Issues Found
None.

## Remaining Tasks (Phase 2-4)
- [ ] 2.1 Create `internal/api/router.go` — chi router, `GET /health`, JSON middleware
- [ ] 2.2 Create `internal/api/pets.go` — list + get by ID
- [ ] 2.3 Create `internal/api/appointments.go` — list (with `?petId=` filter) + get by ID
- [ ] 2.4 Create `internal/api/checkins.go` — `GET /api/v1/pets/:id/checkins`
- [ ] 2.5 Table-driven handler tests for all 6 endpoints
- [ ] 3.1-3.7 Event Indexer tasks
- [ ] 4.1-4.4 Wiring tasks

## Status
7/7 tasks complete. Ready for PR creation targeting feature/tracker branch.
