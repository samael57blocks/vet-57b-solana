# Tasks: Go Backend Service

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,300–1,500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (REST API) → PR 3 (Event Indexer) → PR 4 (Wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes — resolved
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain (PR 1 targets feature/tracker branch)
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: Go module, config, models, DB pool, migrations, Docker, test infra | PR 1 | ~300 lines; no deps |
| 2 | REST API: chi router, 6 endpoints, handler unit tests | PR 2 | ~300 lines; depends on PR 1 |
| 3 | Event Indexer: Solana client, WS subscription, polling, listener, unit tests | PR 3 | ~400 lines; depends on PR 1 |
| 4 | Wiring: main.go, Docker Compose, go.sum, integration tests | PR 4 | ~250 lines; depends on PR 2+3 |

## Phase 1: Foundation & Infrastructure

- [x] 1.1 Init Go module in `backend/` with chi, pgx v5, solana-go deps
- [x] 1.2 Create `internal/config/config.go` with env-based config struct
- [x] 1.3 Create `internal/models/models.go` with Pet, Appointment, Checkin structs
- [x] 1.4 Create `internal/db/migrations/001_init.sql` — 3 tables, FK, upsert
- [x] 1.5 Create `internal/db/db.go` — pgxpool setup + migration runner
- [x] 1.6 Create `backend/Dockerfile` — multi-stage Go build
- [x] 1.7 Scaffold Go test infra: helpers, DB test container setup, mock stubs

## Phase 2: REST API

- [x] 2.1 Create `internal/api/router.go` — chi router, `GET /health`, JSON middleware
- [x] 2.2 Create `internal/api/pets.go` — list + get by ID
- [x] 2.3 Create `internal/api/appointments.go` — list (with `?petId=` filter) + get by ID
- [x] 2.4 Create `internal/api/checkins.go` — `GET /api/v1/pets/:id/checkins`
- [x] 2.5 Table-driven handler tests for all 6 endpoints via `httptest` + mocked DB

## Phase 3: Event Indexer

- [x] 3.1 Create `internal/solana/client.go` — SolanaClient interface + mock
- [x] 3.2 Create `internal/listener/websocket.go` — WS subscription, log parsing for both events, exponential backoff reconnect
- [x] 3.3 Create `internal/listener/poller.go` — periodic GetProgramAccounts with DataSize filter
- [x] 3.4 Create `internal/listener/listener.go` — orchestrator for WS + poller goroutines, graceful shutdown
- [x] 3.5 Unit tests: event parsing from known log strings
- [x] 3.6 Unit tests: account deserialization from known borsh bytes
- [x] 3.7 Unit tests: WS reconnect backoff (1s→2s→...→60s with jitter)

## Phase 4: Wiring & Deployment

- [ ] 4.1 Create `backend/cmd/server/main.go` — config init, wiring, SIGTERM/SIGINT handling
- [ ] 4.2 Modify `docker-compose.yml` — add backend + PostgreSQL services with volume + healthcheck
- [ ] 4.3 Run `go mod tidy` to lock `go.sum`
- [ ] 4.4 DB integration tests: migration idempotency, upsert, FK violations
