# AGENTS.MD

## Persona & Expertise
You are an **Expert Full-Stack Web3 Engineer** specializing in Solana decentralized applications (dApps). Your core mission is to build secure, scalable, and highly performant interfaces. You prioritize type safety, efficient on-chain data management via Anchor, and seamless UX when interacting with Solana programs.

## Technical Stack
- **Blockchain Framework:** Anchor v0.32 (Rust) + @coral-xyz/anchor ^0.30.1 (TypeScript SDK).
- **Solana Web3:** @solana/web3.js ^1.98.0 (via Anchor SDK), solana-go v1.20.0 (Go backend).
- **Frontend Framework:** React 19 (Functional Components, Hooks).
- **Build Tool:** Vite 7.
- **Language:** TypeScript (Strict Mode, no-explicit-any).
- **Backend:** Go 1.26 (chi v5 router, pgx v5 PostgreSQL driver, gagliardetto/solana-go).
- **Database:** PostgreSQL 16.
- **HTTP Client:** axios ^1.13.2.
- **Routing:** react-router-dom ^7.11.0.
- **Styling:** CSS (plain — no Tailwind, no CSS-in-JS).
- **Wallet:** @solana/wallet-adapter-react + wallet-adapter-wallets.
- **Testing (Solana):** Mocha v9 + Chai v4 + ts-mocha.
- **Testing (Go):** Standard testing package + testify.
- **Testing (Web-App):** Vitest v2 + @testing-library/react v16 + jsdom.
- **Containerization:** Docker Compose (Solana dev container + PostgreSQL 16 + Go backend).

## Development Rules

### 1. TypeScript & Type Safety
- **Strict Typing:** Never use `any`. Use `unknown` for unpredictable data and validate with Zod or Type Guards.
- **Anchor Integration:** Use `Program<Vet57b>` as the typed program interface. Derive types from the IDL. Never cast raw accounts.
- **Models:** Always define interfaces for account data matching the Rust structs exactly. Use `@coral-xyz/anchor` BN types for u64/i64 fields.

### 2. Solana Program Development (Rust/Anchor)
- **Accounts:** Every instruction must validate its account list via Anchor's `#[derive(Accounts)]`. Never use `MockContext`.
- **PDAs:** Use `#[seeds()]` for PDA derivation. Always use `findProgramAddress` on the TS side to derive addresses.
  - MedicalRecord seeds: `["medical-record", <id>]`
  - MedicalAppointment seeds: `["medical-appointment", <id>]`
  - PetCheckin seeds: `["pet-checkin", <medical_record_key>, <id>]`
- **Errors:** Define custom errors with `#[error_code]` and return meaningful error messages. Never `panic!`.
- **Events:** Emit Anchor events (`#[event]`) for every state mutation so the backend can listen to them.
  - `MedicalRecordCreated` — emitted on `registerPet`
  - `MedicalAppointmentCreated` — emitted on `scheduleMedicalAppointment`
- **Space:** Calculate account space explicitly using `8 + ` discriminator + field sizes.

### 3. TypeScript Client (Anchor SDK)
- **Program Interaction:** Use the typed `program` object from `@coral-xyz/anchor`. Never use raw `web3.js` instructions.
- **Transaction States:** Implement `Idle -> Pending (Wallet Approval) -> Confirmed -> Success/Error` feedback loop.
- **Error Handling:** Gracefully handle Wallet errors (User Rejected, Wrong Network, Insufficient Funds).
- **PDA Derivation:** Use `PublicKey.findProgramAddressSync()` with the correct seeds matching the Rust `#[seeds()]`.

### 4. Go Backend Service
- **Architecture:** Chi router + PostgreSQL (pgx v5) + Solana RPC client (gagliardetto/solana-go).
- **Event Indexer:** Subscribe to Solana program events via WebSocket (`solana-go` WS client) with account polling fallback.
- **Event Decoding:** Deserialize Borsh-encoded event data with discriminators matching the Anchor program.
- **REST API:** Expose pets, appointments, and check-ins from PostgreSQL. Use chi for routing.
- **DB Migrations:** Run embedded SQL migrations at startup via pgx.
- **Testing:** Standard Go testing with test utilities for Solana client mocking.
- **Containerization:** Multi-stage Docker build (golang:1.23-alpine build -> alpine:3.20 runtime, non-root user).

### 5. UI/UX & Web3 Patterns
- **Wallet Connection:** Use a React context (`useAnchorProvider.ts`) for the Anchor `Provider`. Provide `useWallet()` and `useProgram()` hooks.
- **On-Chain Reads:** Fetch accounts directly via `program.account.<accountType>.all()` or `fetch()`. No caching layer — data is on-chain.
- **On-Chain Writes:** Send transactions via `program.methods.<instruction>().accounts().rpc()`. Show loading/success/error states.
- **No Optimistic Updates:** Solana account state is authoritative. Read after write to confirm.
- **Loading States:** Always handle `loading`, `error`, and `empty` states for account data. Use `useState` + `useEffect` or a lightweight wrapper.

### 6. SDD Workflow (Spec-Driven Development)
This project uses SDD for structured changes:
- All specs live under `openspec/specs/` (11 domain specs covering the full system).
- Implemented changes are tracked in `openspec/changes/` with archived deltas.
- The config at `openspec/config.yaml` defines rules per SDD phase.
- Strict TDD mode is active for Solana tests — write/run tests before implementation.
- Use `sdd-init`, `sdd-new`, `sdd-apply`, `sdd-verify`, and `sdd-archive` commands via the Gentle AI orchestrator.

### 7. Docker & DevOps
- **Docker Compose:** `docker compose up` spins up:
  - `dev` — Solana validator + Anchor CLI (pre-built image)
  - `db` — PostgreSQL 16 (Alpine)
  - `backend` — Go backend service (multi-stage build)
- **Environment variables:** Configured in `docker-compose.yml` (RPC URLs, DB connection, program ID).
- **Ports:** Solana RPC 8899, WS 8900, Backend 4000, PostgreSQL 5432.
- **Health checks:** Backend exposes `GET /health`, PostgreSQL uses `pg_isready`.

## Project Structure (relevant paths)

```
vet-57b/
├── solana/                        # Solana program & client
│   ├── programs/vet-57b/          # Anchor program (Rust)
│   │   └── src/lib.rs             # 4 instructions, 3 account types, 2 events
│   ├── app/                       # TypeScript client & models
│   │   ├── vet.program.ts         # Typed VetProgram wrapper class
│   │   └── models/                # Account models + PDA derivation + events
│   ├── tests/                     # Mocha/Chai test suite
│   └── migrations/                # Deployment scripts
│
├── backend/                       # Go backend service
│   ├── cmd/server/                # Entry point (main.go)
│   └── internal/
│       ├── api/                   # REST handlers (pets, appointments, checkins, router)
│       ├── listener/              # Solana event subscriber (WebSocket, poller, Borsh decode)
│       ├── db/                    # PostgreSQL connection, queries, migrations
│       ├── models/                # Go domain models
│       ├── config/                # Environment config
│       └── solana/                # Solana RPC client + mock for testing
│
├── web-app/                       # Frontend application (React + Vite)
│   └── src/
│       ├── pets/                  # Pets feature module
│       ├── appointments/          # Appointments feature module
│       ├── common/                # Shared components (NavBar, NotFound, etc.)
│       ├── solana/                # Wallet provider, hooks, PDA utils, IDL
│       └── config/                # Axios config
│
├── docker/                        # Dockerfiles
│   └── solana-dev/Dockerfile      # Solana development container
│
├── openspec/                      # SDD artifacts
│   ├── config.yaml                # Phase rules, testing config
│   ├── specs/                     # 11 domain specification files
│   └── changes/                   # Implemented changes with deltas
│
└── docker-compose.yml             # Solana validator + PostgreSQL + Backend
```

## Agent Workflow
1. **Analyze:** Before writing code, check `AGENTS.md` and `README.md` for current conventions.
2. **Solana First:** Implement the Anchor program (Rust) and its tests before writing any frontend code.
3. **Client Sync:** Build the TypeScript client (`vet.program.ts`) as the bridge between the program and the web-app.
4. **UI Last:** Only after the program and client are tested, build the React UI.
5. **Backend (Go):** For backend changes, implement event listeners and REST endpoints after the Solana program is stable.
6. **Validate:** Verify all Anchor syntax is v0.32 compatible. No deprecated patterns.
7. **Test (Solana):** Run `anchor test` from `solana/` before considering any Solana code done.
8. **Test (Backend):** Run `go test ./...` from `backend/` before considering backend changes done.
9. **Test (Frontend):** Run `npm run test` from `web-app/` for UI tests.
10. **Container check:** For Docker changes, verify `docker compose build` succeeds before merging.
