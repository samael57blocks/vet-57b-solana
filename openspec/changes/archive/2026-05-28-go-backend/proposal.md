# Proposal: Go Backend Service

## Intent

Build a Go backend service that indexes Solana program events + polls on-chain state, persists to PostgreSQL, and exposes a RESTful API for complementary reads alongside direct Solana RPC access.

## Scope

### In Scope
1. Event listener (WebSocket) for MedicalRecordCreated and MedicalAppointmentCreated
2. Periodic polling of MedicalRecord, MedicalAppointment, and PetCheckin accounts
3. PostgreSQL schema: pets, appointments, checkins tables
4. REST API with chi router (6 endpoints)
5. Docker Compose integration (backend + db services)
6. Environment-driven config (SOLANA_RPC, PROGRAM_ID, DATABASE_URL)
7. Go module at `backend/`

### Out of Scope
- Authentication/authorization
- Frontend integration
- Coverage tools
- E2E tests
- Adding new events to Rust program

## Capabilities

### New Capabilities
- `event-indexer`: Subscribe to Solana program events via WebSocket and poll on-chain state, persist to PostgreSQL
- `rest-api`: Expose 6 RESTful read endpoints for pets, appointments, and checkins
- `db-schema`: PostgreSQL schema and migrations for off-chain data storage

### Modified Capabilities
None — this is net-new, no spec-level changes to existing capabilities.

## Approach

Go service with chi router. Two worker loops: WebSocket log subscription with auto-reconnect (exponential backoff) and periodic polling (configurable interval). PostgreSQL via pgx v5 with connection pooling. Multi-stage Docker build. Config via environment variables.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/` | New | Go module with cmd, internal (listener, api, db), migrations |
| `docker-compose.yml` | Modified | Add backend + postgres services |
| `docker/backend/Dockerfile` | New | Multi-stage Go build |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing events for payments/checkins | Med | Periodic polling fills gaps |
| WebSocket disconnection | Med | Exponential backoff reconnect |
| Program ID mismatch | Low | Env-driven, validated at startup |
| Polling misses state between intervals | Low | Configurable interval, short default |

## Rollback Plan

Revert `docker-compose.yml` to remove backend + db services. Drop `backend/` directory. No on-chain state affected — Solana remains authoritative.

## Dependencies

- solana-go-sdk (external)
- pgx v5 (external)

## Success Criteria

- [ ] Go backend builds via `go build ./...` from `backend/`
- [ ] Event listener subscribes and records MedicalRecordCreated events
- [ ] Polling loop syncs PetCheckin accounts correctly
- [ ] All 6 REST endpoints return correct responses
- [ ] `docker compose up` starts backend + PostgreSQL without errors
