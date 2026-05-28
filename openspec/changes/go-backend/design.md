# Design: Go Backend Service

## Technical Approach

Go HTTP service with two concurrent worker loops (WebSocket event subscription + periodic account polling) sharing a pgx connection pool. Chi router exposes 6 read-only REST endpoints. Multi-stage Docker build, PostgreSQL migrations via embedded SQL.

Maps to: proposal's 3 capabilities (`event-indexer`, `rest-api`, `db-schema`) and all 3 spec domains.

## Architecture Decisions

### Package Layout: `cmd/` + `internal/`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Flat `main.go` | Simple but no structure | ❌ |
| `cmd/` + `internal/` | Standard Go convention, clear separation, enforces encapsulation | ✅ |

`cmd/server/main.go` is thin (config init, dependency wiring, signal handling). All logic lives in `internal/` — unreachable from outside the module.

### Database Driver: pgx v5

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `database/sql` + lib/pq | Standard lib, but pgx is faster, has native types, pool built-in | ❌ |
| pgx v5 | Native PostgreSQL driver, connection pooling, no external deps for pool | ✅ |

Use `pgxpool` for concurrent access from listener + API handlers. Migrations via raw SQL files read at startup, executed in order.

### Solana SDK: gagliardetto/solana-go

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `solana-client` (raw WebSocket) | Lower level, more control but more boilerplate | ❌ |
| gagliardetto/solana-go | Mature, WS subscriptions via `wsClient`, account polling via `rpcClient`, program account deserialization | ✅ |

Use `rpcClient.GetProgramAccounts()` for polling, `wsClient.OnAccountChange()` / `wsClient.OnLogsSubscribe()` for event streaming.

### Polling Strategy

Configurable interval (default 30s). Track last polled slot in memory; use `GetProgramAccounts` with `DataSize` filter to fetch only relevant account types. Upsert all fetched accounts — `ON CONFLICT (id) DO UPDATE` handles dedup with events implicitly.

### WebSocket Reconnection

Exponential backoff: initial 1s, multiply by 2, cap at 60s. Reset to 1s on successful reconnect. Jitter of ±500ms to avoid thundering herd.

| State | Behavior |
|-------|----------|
| Connected | Subscribe to logs for program ID |
| Disconnected | Close, wait backoff, connect, resubscribe |
| Max retries | Infinite — only fatal errors (wrong network, bad URL) terminate |

### Configuration: Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SOLANA_RPC_URL` | `http://localhost:8899` | RPC endpoint |
| `SOLANA_WS_URL` | `http://localhost:8900` | WebSocket endpoint |
| `PROGRAM_ID` | required | Anchor program public key |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `LISTEN_ADDR` | `:4000` | HTTP server listen address |
| `POLL_INTERVAL` | `30s` | Account polling interval |
| `WS_MAX_BACKOFF` | `60s` | Max backoff for WS reconnect |

No config file — 12-factor app pattern.

### Error Handling & Logging

`slog` (Go 1.21 log/slog) for structured JSON logging. Three levels: `INFO` (startup, subscription changes), `WARN` (reconnection, skipped malformed logs), `ERROR` (DB failures, WS fatal errors). Handlers return structured JSON error bodies (`{"error": "message"}`) with appropriate HTTP codes.

### Docker: Multi-stage Build

| Stage | Base | Purpose |
|-------|------|---------|
| build | `golang:1.23-alpine` | Compile binary |
| runtime | `alpine:3.20` | Minimal runtime |

Binary at `/app/server`. No `ca-certificates` needed (no HTTPS). Healthcheck via `GET /health`.

## Data Flow

```
                          ┌──────────────────┐
                          │   Solana Network  │
                          └────────┬─────────┘
                                   │
                   ┌───────────────┼───────────────┐
                   ▼               ▼               ▼
            WebSocket Logs    RPC Polling     Client Requests
                   │               │               │
                   ▼               ▼               ▼
            ┌────────────┐  ┌────────────┐  ┌────────────┐
            │ websocket  │  │   poller   │  │ chi router │
            │ .go        │  │   .go      │  │ (api/*.go) │
            └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
                   │               │               │
                   │  Parse event  │  Parse acct   │  SELECT
                   │  → Model      │  → Model      │  query
                   ▼               ▼               │
            ┌──────────────────────────────────┐    │
            │        pgx connection pool       │◄───┘
            │       (internal/db/db.go)        │
            └──────────────┬───────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │ (3 tables)   │
                    └──────────────┘

  Worker loops (listener.go orchestrates):
    1. websocket.go:  Parse logs → extract event data → upsert DB
    2. poller.go:     GetProgramAccounts → deserialize → upsert DB
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/go.mod` | Create | Go module definition |
| `backend/go.sum` | Create | Dependency lock file |
| `backend/cmd/server/main.go` | Create | Entry point: config, dependency wiring, signal handling |
| `backend/internal/config/config.go` | Create | Environment-based configuration |
| `backend/internal/db/db.go` | Create | pgxpool setup + migration runner |
| `backend/internal/db/migrations/001_init.sql` | Create | 3 tables with FK, upsert semantics |
| `backend/internal/models/models.go` | Create | Go structs for pets, appointments, checkins |
| `backend/internal/listener/listener.go` | Create | Orchestrator: starts WS + poller goroutines |
| `backend/internal/listener/websocket.go` | Create | WS subscription, event parsing, reconnect |
| `backend/internal/listener/poller.go` | Create | Periodic account polling loop |
| `backend/internal/solana/client.go` | Create | Solana RPC/WS client wrapper |
| `backend/internal/api/router.go` | Create | Chi router setup, middleware |
| `backend/internal/api/pets.go` | Create | GET /api/v1/pets and GET /api/v1/pets/:id |
| `backend/internal/api/appointments.go` | Create | GET /api/v1/appointments and GET /api/v1/appointments/:id |
| `backend/internal/api/checkins.go` | Create | GET /api/v1/pets/:id/checkins |
| `backend/Dockerfile` | Create | Multi-stage Go build |
| `docker-compose.yml` | Modify | Add backend + postgres services |
| `web-app/.env` | Modify | Add backend-related vars if missing |

## Interfaces / Contracts

### REST API

```
GET  /api/v1/pets              → 200 [{id, name, age, animal_type, caretaker_name, caretaker_phone, created_at}] | []
GET  /api/v1/pets/:id          → 200 {pet} | 404
GET  /api/v1/appointments?petId=X → 200 [{...}] | []
GET  /api/v1/appointments/:id  → 200 {appointment} | 404
GET  /api/v1/pets/:id/checkins → 200 [{...}] | 404 (no pet) | []
```

All responses JSON. Errors: `{"error": "message"}`. Health: `GET /health` → 200 `{"status": "ok"}`.

### Event Parsing — Anchor Event Signature Mapping

Anchor events use a SHA-256 based signature derived from the struct namespace. The listener filters logs by matching against `program:YOUR_PROGRAM_ID` and extracts the event discriminator.

| Event | Discriminator (base58 prefix) | Target Table |
|-------|-------------------------------|--------------|
| `MedicalRecordCreated` | First 8 bytes of `sha256("event:MedicalRecordCreated")` | `pets` |
| `MedicalAppointmentCreated` | First 8 bytes of `sha256("event:MedicalAppointmentCreated")` | `appointments` |

### Solana Account → Model Mapping

| Account Type | Deserialization | Target Table |
|-------------|-----------------|--------------|
| `MedicalRecord` | Anchor borsh decode | `pets` |
| `MedicalAppointment` | Anchor borsh decode | `appointments` |
| `PetCheckin` | Anchor borsh decode | `checkins` |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (handlers) | All 6 endpoints | `httptest.NewServer` with mocked DB interface |
| Integration (DB) | Migrations, upsert, queries, FK violations | Testcontainers or temp PG with `pgxpool` |
| Unit (listener) | Event parsing from raw logs | Test with known-good base58-encoded log strings |
| Unit (poller) | Account deserialization | Test with known Anchord borsh-encoded bytes |
| Mock Solana RPC | `GetProgramAccounts`, log subscription | Interface `SolanaClient` with mock implementation |

`SolanaClient` interface in `internal/solana/client.go` allows swapping real RPC for test mocks. DB layer tested via testcontainers or a dedicated test DB.

## Migration / Rollout

No migration — net-new service. Deploy `docker compose up -d backend db` alongside existing Solana dev container. First startup runs SQL migrations automatically. Backend starts polling and subscribing immediately.

## Open Questions

- [ ] None — all decisions covered by spec requirements.
