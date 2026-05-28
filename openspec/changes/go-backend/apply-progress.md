# Apply Progress: Go Backend — PR 2 (REST API)

## Change
`go-backend` — Phase 2 REST API (PR 2 of 4)

## Mode
Standard — No Strict TDD (Go module has no pre-configured test runner; test infra is scaffolded in 1.7)

## Delivery
- Chain strategy: `feature-branch-chain`
- This PR targets the PR 1 branch (`feat/go-backend-01-foundation`), not main
- Estimated ~450 lines (within chained PR plan)

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

### 2.1 Chi router
- **File**: `backend/internal/api/router.go`
- **What**: Chi router with Logger, Recoverer, JSON Content-Type middleware, `GET /health` returning `{"status":"ok"}`

### 2.2 Pets handlers
- **File**: `backend/internal/api/pets.go`
- **What**: `GET /api/v1/pets` (list) and `GET /api/v1/pets/{id}` (by ID). PetsResource struct with Querier interface.

### 2.3 Appointments handlers
- **File**: `backend/internal/api/appointments.go`
- **What**: `GET /api/v1/appointments?petId=X` (filtered list) and `GET /api/v1/appointments/{id}`

### 2.4 Checkins handler
- **File**: `backend/internal/api/checkins.go`
- **What**: `GET /api/v1/pets/{id}/checkins` (as method on PetsResource)

### 2.5 Handler tests
- **File**: `backend/internal/api/router_test.go`
- **Files**: `backend/internal/api/queries.go` (Querier interface, 6 methods), `backend/internal/api/helpers.go` (writeJSON/writeError), `backend/internal/db/queries.go` (pgxpool-backed Querier)
- **Tests**: 20 table-driven tests across 7 test functions, mockQuerier with function fields
- **Pattern**: `httptest.NewServer` + mock DB interface

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
| `backend/internal/api/router.go` | Created | Chi router with middleware, health endpoint |
| `backend/internal/api/pets.go` | Created | PetsResource: List, Get |
| `backend/internal/api/appointments.go` | Created | AppointmentsResource: List, Get |
| `backend/internal/api/checkins.go` | Created | Checkins handler on PetsResource |
| `backend/internal/api/queries.go` | Created | Querier interface (6 methods) |
| `backend/internal/api/helpers.go` | Created | writeJSON/writeError response helpers |
| `backend/internal/api/router_test.go` | Created | 20 table-driven tests |
| `backend/internal/db/queries.go` | Created | pgxpool-backed Querier implementation |
| `backend/go.mod` | Modified | Added chi v5.2.1 direct dep |
| `backend/go.sum` | Modified | Lock file updated |
| `openspec/changes/go-backend/tasks.md` | Modified | Marked Phase 1-2 tasks [x] |

## Deviations from Design
None — implementation matches design.md.

## Issues Found
None.

## Remaining Tasks (Phase 3-4)
- [ ] 3.1-3.7 Event Indexer tasks
- [ ] 4.1-4.4 Wiring tasks

## Status
12/12 tasks complete (7 Phase 1 + 5 Phase 2). Ready for PR creation targeting `feat/go-backend-01-foundation`.
