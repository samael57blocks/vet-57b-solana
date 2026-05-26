# Tasks: Change 2 — Web-App On-Chain Features

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1300–1500 (hand-written); ~2800 total incl. copied IDL |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** |
| Suggested split | PR 1: Foundation + Infra → PR 2: Services + Pets → PR 3: Appointments + Integration |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: **Yes**
Chained PRs recommended: **Yes**
Chain strategy: **pending**
400-line budget risk: **High**

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + Infra Layer (Tasks 1–6) | PR 1 | Self-contained: Vitest, provider, hooks, PDA helpers + tests. No service/UI code. |
| 2 | Services + Pets Feature (Tasks 7–15) | PR 2 | Depends on PR 1. petSolanaService, RegisterPetForm, PetOverview, hook + test updates. |
| 3 | Appointments + Integration (Tasks 16–22) | PR 3 | Depends on PR 2. Appointment hooks/components, check-in, router, final wiring, build verify. |

---

## Phase 1: Foundation (no code dependencies)

- [x] **1.1** Install Vitest + configure `vitest.config.ts` + `tsconfig.app.json` changes
  - **Files**: `vitest.config.ts` (new), `tsconfig.app.json` (modify), `src/__tests__/setup.ts` (new)
  - **Depends on**: —
  - **Est. lines**: ~40
  - **Acceptance**: `vitest` CLI runs without error; `tsconfig.app.json` includes `resolveJsonModule: true` + vitest types
  - **TDD**: no

- [x] **1.2** Add Solana/Anchor deps to `package.json`, create `.env`
  - **Files**: `package.json` (modify), `.env` (new), `.env.example` (modify)
  - **Depends on**: —
  - **Est. lines**: ~20
  - **Acceptance**: `@solana/web3.js`, `@solana/wallet-adapter-*`, `@coral-xyz/anchor` in deps; `.env` has `VITE_SOLANA_RPC_URL` + `VITE_PROGRAM_ID`; `.env.example` updated
  - **TDD**: no

- [x] **1.3** Copy IDL JSON + `vet_57b.ts` types from `solana/target/` into web-app
  - **Files**: `src/solana/idl/vet_57b.json` (new), `src/solana/types/vet_57b.ts` (new)
  - **Depends on**: —
  - **Est. lines**: ~10 (copy) + 1491 (copied content)
  - **Acceptance**: Both files exist under `src/solana/` matching the Anchor build output
  - **TDD**: no

## Phase 2: Infra Layer (depends on Phase 1)

- [x] **2.1** Create `solana/provider.tsx` — AnchorProvider wrapper component
  - **Files**: `src/solana/provider.tsx` (new)
  - **Depends on**: [1.2]
  - **Est. lines**: ~45
  - **Acceptance**: Exports `SolanaProvider` that nests `ConnectionProvider → WalletProvider → AnchorProvider`. RPC URL configurable via `VITE_SOLANA_RPC_URL`. Shows config error when URL missing.
  - **TDD**: no

- [x] **2.2** Create `useAnchorProvider.ts`, `useVetProgram.ts`, `useTxState.ts` hooks
  - **Files**: `src/solana/useAnchorProvider.ts` (new), `src/solana/useVetProgram.ts` (new), `src/common/hooks/useTxState.ts` (new)
  - **Depends on**: [2.1]
  - **Est. lines**: ~90
  - **Acceptance**: `useVetProgram()` returns `Program<Vet57b>` | null. `useTxState()` exposes `{ state, execute, reset }` with Idle→Pending(wallet-approval/sending/confirmed)→Success/Error state machine.
  - **TDD**: no

- [x] **2.3** Create `solana/pda.ts` — PDA derivation helpers matching Rust seeds
  - **Files**: `src/solana/pda.ts` (new)
  - **Depends on**: —
  - **Est. lines**: ~35
  - **Acceptance**: Exports `deriveMedicalRecordAddress`, `deriveMedicalAppointmentAddress`, `derivePetCheckinAddress` — seeds match `#[seeds()]` in Anchor Rust code
  - **TDD**: no (tests in 2.4)

- [x] **2.4** Write PDA derivation tests (Vitest) + hook tests for useVetProgram + useTxState
  - **Files**: `src/__tests__/solana/pda.test.ts` (new)
  - **Depends on**: [2.3]
  - **Est. lines**: ~55
  - **Acceptance**: Test calls each PDA function with known `Keypair.generate().publicKey` and asserts result is non-null `PublicKey`. Verifies deterministic output (same input → same PDA).
  - **TDD**: yes — test first, then pda.ts implementation

## Phase 3: Services (depends on Phase 2)

- [ ] **3.1** Create `petSolanaService.ts` — `getPets`, `registerPet`
  - **Files**: `src/pets/services/solana/petService.ts` (new)
  - **Depends on**: [2.2]
  - **Est. lines**: ~65
  - **Acceptance**: `getPets(program)` calls `program.account.medicalRecord.all()` filtered by owner. `registerPet(program, data, authority)` calls `program.methods.registerPet().accounts().rpc()`. Type mapping: Anchor `{ dog: {} }|{ cat: {} }` ↔ `'Dog'|'Cat'`.
  - **TDD**: no (tests in 3.4)

- [ ] **3.2** Create `appointmentSolanaService.ts` — `schedule`, `pay`, `list`
  - **Files**: `src/appointments/services/solana/appointmentService.ts` (new)
  - **Depends on**: [2.2]
  - **Est. lines**: ~85
  - **Acceptance**: `list(program)` fetches `MedicalAppointment` accounts. `schedule(program, data, authority)` calls `scheduleMedicalAppointment`. `pay(program, data, authority)` calls `payMedicalAppointment`. Maps Anchor `u64` ↔ `BN`, `i64` ↔ `BN`.
  - **TDD**: no (tests in 3.4)

- [ ] **3.3** Create `checkinSolanaService.ts` — `takePetToVet`
  - **Files**: `src/appointments/services/solana/checkinService.ts` (new)
  - **Depends on**: [2.2]
  - **Est. lines**: ~45
  - **Acceptance**: `checkin(program, data, authority)` generates a `Keypair` for check-in ID, calls `program.methods.takePetToVet().accounts().rpc()`. Returns signature + checkinPubkey.
  - **TDD**: no (tests in 3.4)

- [ ] **3.4** Write service tests (mocked program)
  - **Files**: `src/__tests__/solana/petSolanaService.test.ts` (new)
  - **Depends on**: [3.1], [3.2], [3.3]
  - **Est. lines**: ~85
  - **Acceptance**: `vi.mock('@coral-xyz/anchor')` + mock `program.account.medicalRecord.all()` returns fake records. Test `getPets` returns mapped `Pet[]`, `registerPet` returns signature string. Test error propagation.
  - **TDD**: yes — test first

## Phase 4: Pets Feature (depends on Phase 3)

- [ ] **4.1** Create `RegisterPetForm.tsx` component
  - **Files**: `src/pets/components/RegisterPetForm.tsx` (new)
  - **Depends on**: [3.1], [2.2]
  - **Est. lines**: ~110
  - **Acceptance**: Form with name, species (cat/dog), breed, birth date. Validates all fields inline. Composes `useTxState()`. Shows Idle→Pending→Confirmed→Success/Error states. Disabled during tx. Explorer link on success.
  - **TDD**: no (tests in 4.5)

- [ ] **4.2** Update `PetOverview.tsx` for on-chain data
  - **Files**: `src/pets/components/PetOverview.tsx` (modify)
  - **Depends on**: —
  - **Est. lines**: ~15
  - **Acceptance**: Shows caretaker name, species, breed in addition to existing name/age/image
  - **TDD**: no

- [ ] **4.3** Update `usePetsOverview.ts` hook for Solana
  - **Files**: `src/pets/hooks/usePetsOverview.ts` (modify)
  - **Depends on**: [3.1], [2.2]
  - **Est. lines**: ~35
  - **Acceptance**: Uses `useVetProgram()` + `petSolanaService.getPets` when connected. Returns `{ pets, loading, error }`. Refetches when `publicKey` changes. Returns empty/error states.
  - **TDD**: no (tests in 4.5)

- [ ] **4.4** Update `pet.ts` types (add breed, align with on-chain)
  - **Files**: `src/pets/types/pet.ts` (modify)
  - **Depends on**: —
  - **Est. lines**: ~5
  - **Acceptance**: `Pet` interface adds `breed: string`. AnimalType stays `'Dog'|'Cat'`. Bridge utility functions `animalTypeToRecord()` and `recordToAnimalType()` added (in solana service or a shared types file).
  - **TDD**: no

- [ ] **4.5** Update `PetsOverviewView.tsx` — use new hook, remove inline form
  - **Files**: `src/pets/views/PetsOverviewView.tsx` (modify)
  - **Depends on**: [4.1], [4.3]
  - **Est. lines**: ~40
  - **Acceptance**: Render uses `RegisterPetForm` component instead of inline form. Hook passes `loading`/`error`/`pets` props. Loading skeleton when fetching. Error with retry. Empty state with CTA.
  - **TDD**: no

- [ ] **4.6** Update `PetsOverview.tsx` page — pass loading/error states
  - **Files**: `src/pets/pages/PetsOverview.tsx` (modify)
  - **Depends on**: [4.3], [4.5]
  - **Est. lines**: ~10
  - **Acceptance**: Passes `{ pets, loading, error }` to `PetsOverviewView`. Handles retry.
  - **TDD**: no

- [ ] **4.7** Write component/hook tests
  - **Files**: `src/__tests__/pets/usePetsOverview.test.ts` (new), `src/__tests__/pets/RegisterPetForm.test.ts` (new)
  - **Depends on**: [4.1], [4.3]
  - **Est. lines**: ~150
  - **Acceptance**: `usePetsOverview` test covers loading→data, loading→error, empty states. `RegisterPetForm` test covers validation errors, submit flow, tx state transitions, disconnect prompt. Mock `useVetProgram` + service layer.
  - **TDD**: yes — test first

## Phase 5: Appointments Feature (depends on Phase 3)

- [ ] **5.1** Update `medicalAppointment.ts` types to align with on-chain
  - **Files**: `src/appointments/types/medicalAppointment.ts` (modify)
  - **Depends on**: —
  - **Est. lines**: ~10
  - **Acceptance**: Fields match Anchor `MedicalAppointment` struct: `id: string`, `medicalRecord: string`, `date: Date`, `time: string`, `appointmentValue: number`, `paidValue: number`. Plus status enum derived from comparing values.
  - **TDD**: no

- [ ] **5.2** Create `useAppointments.ts` hook
  - **Files**: `src/appointments/hooks/useAppointments.ts` (new)
  - **Depends on**: [3.2], [2.2]
  - **Est. lines**: ~55
  - **Acceptance**: `useAppointments(program)` fetches all appointments, returns `{ appointments, loading, error }`. Uses `program.account.medicalAppointment.all()`. Refetches on publicKey change.
  - **TDD**: no

- [ ] **5.3** Create appointment UI components (list, schedule, pay)
  - **Files**: `src/appointments/components/AppointmentList.tsx` (new), `src/appointments/components/ScheduleAppointmentForm.tsx` (new), `src/appointments/components/PayAppointmentForm.tsx` (new)
  - **Depends on**: [5.1], [5.2], [3.2]
  - **Est. lines**: ~200
  - **Acceptance**: `AppointmentList` shows pet name, date, time, status badge. `ScheduleAppointmentForm` selects from registered pets, validates date/reason, uses `useTxState()`. `PayAppointmentForm` shows cost, accepts amount, enforces no overpayment, uses `useTxState()`.
  - **TDD**: no

- [ ] **5.4** Create check-in UI component
  - **Files**: `src/appointments/components/CheckinForm.tsx` (new)
  - **Depends on**: [3.3], [2.2]
  - **Est. lines**: ~50
  - **Acceptance**: Selects registered pet, calls `takePetToVet`. Shows pending→confirmed→success flow. Displays block timestamp on success. Handles duplicate check-in error.
  - **TDD**: no

- [ ] **5.5** Fix `appoinments` → `appointments` directory + NavBar hrefs
  - **Files**: `src/appoinments/` → `src/appointments/` (rename), `src/common/components/NavBar.tsx` (modify), update all internal imports
  - **Depends on**: [5.1]
  - **Est. lines**: ~10
  - **Acceptance**: Directory renamed. NavBar uses `<Link to="/appointments">`. All existing imports updated.
  - **TDD**: no

- [ ] **5.6** Add appointment routes to `router.tsx`
  - **Files**: `src/router.tsx` (modify)
  - **Depends on**: [5.2], [5.3], [5.4]
  - **Est. lines**: ~15
  - **Acceptance**: Routes `/appointments` renders appointment list. Sub-routes for schedule, pay, check-in if using nested routes.
  - **TDD**: no

## Phase 6: Integration (depends on all features)

- [ ] **6.1** Update `main.tsx` with provider chain
  - **Files**: `src/main.tsx` (modify)
  - **Depends on**: [2.1]
  - **Est. lines**: ~15
  - **Acceptance**: Wraps `<RouterProvider>` inside `<SolanaProvider>`. Structure: `StrictMode > SolanaProvider > RouterProvider`.
  - **TDD**: no

- [ ] **6.2** Update `App.tsx` — keep `<Outlet>` layout
  - **Files**: `src/App.tsx` (modify)
  - **Depends on**: [6.1]
  - **Est. lines**: ~5
  - **Acceptance**: Verify `<Outlet>` and `<NavBar>` still work. `MainPage` component remains.
  - **TDD**: no

- [ ] **6.3** Verify `npm run build` succeeds with 0 TS errors
  - **Files**: — (verification step)
  - **Depends on**: all previous
  - **Est. lines**: 0
  - **Acceptance**: `tsc -b && vite build` exits 0 with no type errors. Resolve any `verbatimModuleSyntax`, `resolveJsonModule`, or Anchor BN type issues.
  - **TDD**: no

- [ ] **6.4** Run `vitest` — all tests pass
  - **Files**: — (verification step)
  - **Depends on**: all previous
  - **Est. lines**: 0
  - **Acceptance**: `vitest run` exits 0. All PDA derivation, service, hook, and component tests pass.
  - **TDD**: no
