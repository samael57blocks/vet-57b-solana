# Vet 57B — Full-Stack Solana dApp for Veterinary Clinic Management

A complete **full-stack decentralized application** built on Solana for veterinary clinic management. This project demonstrates end-to-end Web3 development: an Anchor-based Solana program, an event-indexing Go backend, and a React frontend — all running together via Docker Compose.

Built as part of the 57Blocks Web3 development training program.

---

## Architecture Overview

```
                    ┌───────────────────┐
                    │   React Frontend   │
                    │  (Vite + Anchor)   │
                    └────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │  Solana RPC  │ │Backend   │ │  Wallet      │
     │  (validator) │ │REST API  │ │  Adapter     │
     └──────┬───────┘ └────┬─────┘ └──────────────┘
            │              │
            ▼              ▼
     ┌──────────────┐ ┌──────────┐
     │  Solana      │ │PostgreSQL│
     │  Program     │ │    16    │
     │  (Anchor)    │ └──────────┘
     └──────────────┘
```

## Components

### 1. Solana Program (Rust / Anchor v0.32)

Anchor program managing three account types with PDA-based derivation:

| Account | Seeds | Instructions |
|---------|-------|-------------|
| `MedicalRecord` | `["medical-record", <id>]` | `registerPet` |
| `MedicalAppointment` | `["medical-appointment", <id>]` | `scheduleMedicalAppointment`, `payMedicalAppointment` |
| `PetCheckin` | `["pet-checkin", <medical_record>, <id>]` | `takePetToVet` |

- **Events**: `MedicalRecordCreated`, `MedicalAppointmentCreated` — emitted for off-chain consumption
- **Payments**: Supports partial and full payment, rejects overpayment via `PaymentExceedsCost` error
- **Check-ins**: On-chain timestamped arrival records for pets
- **Deployed**: localnet & devnet at `6uka17bBE74Sf5s9AMqQvPRMsk3ujb8JhaUpMHYpg5mv`

### 2. TypeScript Client (`@coral-xyz/anchor`)

Typed `VetProgram` wrapper in `solana/app/vet.program.ts` — provides typed helper methods with automatic PDA derivation for all 4 instructions.

### 3. Backend Service (Go)

A Go 1.26 service bridging on-chain data with traditional REST:

- **Event Listener**: Subscribes to Solana program events via WebSocket + polling, persists to PostgreSQL 16
- **REST API** (chi router): Pets CRUD, appointments, check-ins, health check
- **PostgreSQL 16**: Migrations for event store and query models
- **Production-ready**: Multi-stage Docker build, non-root user, health check

### 4. Frontend (React 19 + Vite 7 + TypeScript)

Modern React SPA with wallet-connected experiences:

- **Wallet connection**: `@solana/wallet-adapter-react` + wallet-standard
- **Feature modules**: `pets/`, `appointments/`, `common/` (atomic-design-aligned)
- **Direct on-chain reads**: `program.account.<type>.all()`
- **Backend HTTP**: Axios for REST API calls
- **Routing**: react-router-dom v7 with nested layouts
- **Styling**: Plain CSS (no Tailwind, no CSS-in-JS)

### 5. DevOps

- **Docker Compose**: Spins up Solana dev validator + PostgreSQL 16 + Go backend
- **Solana dev container**: Pre-built with Rust, Anchor CLI, Solana CLI 1.18.26
- **SDD workflow**: Spec-Driven Development with engram/openspec persistence
- **CI-ready**: ESLint, Prettier, TypeScript strict mode, Vitest, Mocha/Chai tests

---

## Project Structure

```
vet-57b/
├── solana/                        # Solana program & client
│   ├── programs/vet-57b/          # Anchor program (Rust)
│   │   └── src/lib.rs             # 4 instructions, 3 accounts, 2 events
│   ├── app/                       # TypeScript client & models
│   │   ├── vet.program.ts         # Typed VetProgram wrapper
│   │   └── models/                # Account interfaces & PDA derivation
│   ├── tests/                     # Mocha + Chai integration tests
│   └── migrations/                # Deployment scripts
│
├── backend/                       # Go backend service
│   ├── cmd/server/                # Entry point
│   └── internal/
│       ├── api/                   # REST handlers (pets, appointments, checkins)
│       ├── listener/              # Solana event subscriber (WebSocket + poller)
│       ├── db/                    # PostgreSQL connection & migrations
│       ├── models/                # Domain models
│       ├── config/                # Environment-based config
│       └── solana/                # Solana RPC client wrapper
│
├── web-app/                       # Frontend application
│   ├── src/
│   │   ├── pets/                  # Pets feature module
│   │   ├── appointments/          # Appointments feature module
│   │   ├── common/                # Shared components & pages
│   │   ├── solana/                # Wallet provider, hooks, PDA utils
│   │   └── config/                # Axios setup
│   └── ...
│
├── docker/                        # Dockerfiles
│   └── solana-dev/Dockerfile      # Solana development environment
│
├── openspec/                      # SDD artifacts (Spec-Driven Development)
│   ├── specs/                     # 11 domain specs
│   └── changes/                   # Implemented changes (archived)
│
└── docker-compose.yml             # Solana validator + PostgreSQL + Backend
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Solana |
| Smart Contract Framework | Anchor v0.32 |
| Program Language | Rust (nightly-2025-09-01) |
| TypeScript SDK | @coral-xyz/anchor ^0.30.1 |
| Backend | Go 1.26 (chi, pgx, solana-go) |
| Database | PostgreSQL 16 |
| Frontend | React 19 + Vite 7 + TypeScript strict |
| Wallet | @solana/wallet-adapter-* |
| Testing (Solana) | Mocha v9 + Chai v4 + ts-mocha |
| Testing (Web) | Vitest v2 + Testing Library |
| Containerization | Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js](https://nodejs.org/) v18+ (for web-app local dev)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (optional, for local-only dev)

### Full Stack with Docker

```bash
# Build all services
docker compose build

# Start PostgreSQL + Backend in background
docker compose up -d db backend

# Run Solana tests in dev container
docker compose run --rm dev anchor test

# Build the Solana program
docker compose run --rm dev anchor build
```

### Frontend (local dev)

```bash
cd web-app
npm install
npm run dev
```

### Solana Program (local dev without Docker)

```bash
cd solana
yarn install
anchor build
anchor test
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/pets` | List all pets |
| GET | `/api/pets/:id` | Get pet by ID |
| GET | `/api/appointments` | List all appointments |
| GET | `/api/appointments/:id` | Get appointment by ID |
| GET | `/api/appointments?petId=:id` | Query appointments by pet |
| GET | `/api/checkins` | List all check-ins |
| GET | `/api/checkins/:id` | Get check-in by ID |

---

## Design Principles

- **Solana-first**: Program first, then client, then UI
- **No optimistic updates**: On-chain state is always authoritative
- **Typed end-to-end**: Rust structs → TypeScript interfaces → Go models
- **Event-driven**: On-chain mutations emit events consumed by the backend indexer
- **Spec-driven development**: Every change is proposed, spec'd, designed, tasked, applied, and verified

---

## License

ISC

---

*Part of the 57Blocks Web3 development training program.*
