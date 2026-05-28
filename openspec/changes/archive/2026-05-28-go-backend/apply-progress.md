# Apply Progress: Go Backend — PR 3 (Event Indexer)

## Change
`go-backend` — Phase 3 Event Indexer (PR 3 of 4)

## Mode
Standard — Go uses `go test` framework. Tests are table-driven with mock interfaces.

## Delivery
- Chain strategy: `feature-branch-chain`
- PR 3 targets PR 2 branch (`feat/go-backend-02-api`)
- All 45 tests pass (20 API + 4 solana + 21 listener)

## Completed Tasks

### Phase 1 (from PR 1 — Foundation)

- [x] 1.1 Init Go module in `backend/` with chi, pgx v5, solana-go deps
- [x] 1.2 Create `internal/config/config.go` with env-based config struct
- [x] 1.3 Create `internal/models/models.go` with Pet, Appointment, Checkin structs
- [x] 1.4 Create `internal/db/migrations/001_init.sql` — 3 tables, FK, upsert
- [x] 1.5 Create `internal/db/db.go` — pgxpool setup + migration runner
- [x] 1.6 Create `backend/Dockerfile` — multi-stage Go build
- [x] 1.7 Scaffold Go test infra: helpers, DB test container setup, mock stubs

### Phase 2 (from PR 2 — REST API)

- [x] 2.1 Chi router with middleware, `GET /health`
- [x] 2.2 Pets handlers: `GET /api/v1/pets` (list) and `GET /api/v1/pets/{id}`
- [x] 2.3 Appointments handlers: list with `?petId=` filter and get by ID
- [x] 2.4 Checkins handler: `GET /api/v1/pets/{id}/checkins`
- [x] 2.5 20 table-driven handler tests via httptest + mock Querier

### Phase 3 (this PR — Event Indexer)

#### 3.1 SolanaClient interface + mock
- **File**: `internal/solana/client.go`, `internal/solana/client_test.go`
- **What**: SolanaClient interface with GetProgramAccounts, SubscribeLogs, Close + MockSolanaClient with function fields + 8 sub-tests

#### 3.2 WebSocket listener
- **File**: `internal/listener/websocket.go`
- **What**: WS subscription via SolanaClient.SubscribeLogs, Anchor event log parsing (MedicalRecordCreated, MedicalAppointmentCreated), exponential backoff reconnect (1s initial, x2, 60s cap, ±500ms jitter)

#### 3.3 Account poller
- **File**: `internal/listener/poller.go`
- **What**: Periodic GetProgramAccounts with DataSize filter (175/111/81), manual borsh deserialization for all 3 account types, upsert to DB

#### 3.4 Listener orchestrator
- **File**: `internal/listener/listener.go`
- **What**: Concurrent WS + poller goroutines via sync.WaitGroup, graceful shutdown via context cancellation

#### 3.5-3.7 Unit tests
- **File**: `internal/listener/listener_test.go` (21 test functions)
- Event parsing: 6 test functions (happy path, non-event, malformed, unknown discriminator, too-short)
- Account deserialization: 6 test functions (MedicalRecord, MedicalAppointment, PetCheckin, wrong discriminators, truncated)
- Backoff: 7 test functions (initial delay, doubling, cap, reset, jitter, default max, range)

### Supporting files
- `internal/listener/borsh.go` — Manual borsh decoder
- `internal/listener/discriminators.go` — Pre-computed SHA-256 discriminator constants
- `internal/listener/eventstore.go` — EventStore interface + typed params + MockEventStore
- `internal/listener/dbadapter.go` — Bridge: db.Queries primitives → EventStore
- `internal/db/queries.go` — Added 3 upsert methods (UpsertPet, UpsertAppointment, UpsertCheckin)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/internal/solana/client.go` | Created | SolanaClient interface + MockSolanaClient |
| `backend/internal/solana/client_test.go` | Created | 4 test functions, 8 sub-tests |
| `backend/internal/listener/borsh.go` | Created | Manual borsh decoder |
| `backend/internal/listener/discriminators.go` | Created | Discriminator constants |
| `backend/internal/listener/eventstore.go` | Created | EventStore interface + typed params + Mock |
| `backend/internal/listener/dbadapter.go` | Created | DB bridge adapter |
| `backend/internal/listener/websocket.go` | Created | WS subscription, event parsing, Backoff |
| `backend/internal/listener/poller.go` | Created | Account polling, borsh deserialization |
| `backend/internal/listener/listener.go` | Created | Orchestrator: WS + poller |
| `backend/internal/listener/listener_test.go` | Created | 21 test functions |
| `backend/internal/db/queries.go` | Modified | Added 3 upsert methods |
| `backend/go.mod` | Modified | Added gagliardetto/solana-go v1.20.0 |
| `backend/go.sum` | Modified | Lock file updated |
| `openspec/changes/go-backend/tasks.md` | Modified | Marked Phase 3 tasks [x] |

## Deviations from Design
1. **Borsh**: Manual deserialization instead of gagliardetto/borsh lib — structs are simple fixed-size, avoids dependency weight.
2. **SolanaClient interface**: Abstracts WS/RPC calls. Real implementation wired in Phase 4 (main.go).
3. **Solana-go**: Only used for base58 pubkey encoding (`PublicKeyFromBytes().String()`).

## Remaining Tasks (Phase 4)

- [ ] 4.1 Create `backend/cmd/server/main.go` — config init, wiring, signal handling
- [ ] 4.2 Modify `docker-compose.yml` — add backend + PostgreSQL services
- [ ] 4.3 Run `go mod tidy` to lock `go.sum`
- [ ] 4.4 DB integration tests: migration idempotency, upsert, FK violations

## Status
**19/22 tasks complete** (7 Phase 1 + 5 Phase 2 + 7 Phase 3). Ready for PR 3.
