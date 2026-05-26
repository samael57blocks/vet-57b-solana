# Design: Change 2 — Web-App On-Chain Features

## Technical Approach

Layer a Solana provider chain on top of the existing React tree, then replace mock/REST services with on-chain services backed by typed Anchor program calls. Each feature module (pets, appointments, check-in) gets a solana service, a typed hook, and UI components that handle the full transaction state machine. The existing `IPetService` interface adapts to accept a `Program<Vet57b>` parameter instead of being replaced wholesale.

## Architecture Decisions

### Decision: Provider placement — `main.tsx` wraps the router

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Providers in `App.tsx` | Loses `RouterProvider` context inside providers | ❌ |
| Providers in `main.tsx` wrapping `<RouterProvider>` | Clean separation; providers available to all routes | ✅ |
| Providers in a wrapper component | Extra indirection with no benefit | ❌ |

`main.tsx` becomes: `StrictMode > ConnectionProvider > WalletProvider > AnchorProvider > RouterProvider`. The `<App>` component (with `<Outlet>`) is inside the provider chain via the router.

### Decision: Service pattern — function-based with program param, not class-based

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Extend `IPetService` interface to include program | Forces mock/rest to also carry program | ❌ |
| New `petSolanaService` module with `(program, ...args) => Promise<T>` | Clean; composes with existing `PetService` env switch | ✅ |
| Wrap in a class like `VetProgram` in solana/app | Works but adds class overhead for simple stateless fns | ❌ |

Each solana service is a plain module exporting async functions that take `Program<Vet57b>` as first arg. The env variable `VITE_USE_MOCK_DATA` still selects mock vs on-chain at the hook level. The `petSolanaService` lives alongside mock/rest under `pets/services/solana/`.

### Decision: PDA derivation — static helper functions, not classes

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Copy `solana/app/models` classes into web-app | Duplicates models; adds class boilerplate | ❌ |
| Inline `PublicKey.findProgramAddressSync` in each service | Repeated code, error-prone | ❌ |
| Static helper functions in `solana/pda.ts` | Single source of truth; matches seeds from Rust | ✅ |

A `solana/pda.ts` module exports `deriveMedicalRecordAddress(id, programId)`, `deriveMedicalAppointmentAddress(id, programId)`, and `derivePetCheckinAddress(medicalRecord, id, programId)` — clean, testable, tree-shakeable.

### Decision: Transaction state — hook per write action, not global context

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Global `TxStateContext` | Over-engineered; every write action has similar but slightly different state | ❌ |
| `useTxState()` generic hook reused by each form | Reusable; composition over context | ✅ |
| Inline state in each component | Duplicated logic | ❌ |

A `useTxState()` hook in `common/hooks/` encapsulates the state machine. Each write form (RegisterPetForm, ScheduleAppointmentForm, PayAppointmentForm, CheckinForm) composes it.

## Data Flow

```
Wallet (Phantom/Backpack)
    │
    ▼
wallet-adapter-react ──► useAnchorWallet()
    │                           │
    ▼                           ▼
ConnectionProvider ──────────► useConnection()
    │                           │
    └───────────┬───────────────┘
                ▼
        AnchorProvider (id + wallet + connection)
                │
                ▼
        Program<Vet57b> (typed via IDL)
                │
        ┌───────┴───────────┐
        ▼                   ▼
  petSolanaService   appointmentSolanaService
        │                   │
        ▼                   ▼
  program.account     program.methods
  .medicalRecord      .scheduleMedicalAppointment(...)
  .all()              .accounts(...).rpc()
```

**Read flow**: Component → hook → solana service → `program.account.medicalRecord.all()` → typed data → component re-render.

**Write flow**: Form → `useTxState()` (idle→pending) → wallet approval → `useTxState()` (sending) → `program.methods.registerPet(...).accounts(...).rpc()` → signature → `useTxState()` (confirmed→success).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `web-app/package.json` | Modify | Add Solana wallet-adapter + Anchor + Vitest deps |
| `web-app/vite.config.ts` | Modify | Add `/// <reference types="vitest">` + test config |
| `web-app/vitest.config.ts` | Create | Vitest config with jsdom, setup file |
| `web-app/tsconfig.app.json` | Modify | Add `resolveJsonModule: true`, vitest types |
| `web-app/.env` | Create | `VITE_SOLANA_RPC_URL`, `VITE_PROGRAM_ID` |
| `web-app/.env.example` | Modify | Add Solana env vars |
| `web-app/src/main.tsx` | Modify | Wrap with provider chain |
| `web-app/src/App.tsx` | Modify | Remove old `RouterProvider`, keep `Outlet` layout |
| `web-app/src/router.tsx` | Modify | Wrap `createBrowserRouter` with provider chain or use new layout |
| `web-app/src/solana/provider.tsx` | Create | Provider component wrapping all wallet + anchor providers |
| `web-app/src/solana/useAnchorProvider.ts` | Create | Hook: `useConnection` + `useAnchorWallet` → AnchorProvider |
| `web-app/src/solana/useVetProgram.ts` | Create | Hook: typed `Program<Vet57b>` from provider + IDL |
| `web-app/src/solana/pda.ts` | Create | PDA derivation helpers matching Rust seeds |
| `web-app/src/solana/types/vet_57b.ts` | Create | Copied from `solana/target/types/vet_57b.ts` |
| `web-app/src/solana/idl/vet_57b.json` | Create | Copied from `solana/target/idl/vet_57b.json` |
| `web-app/src/pets/services/solana/petService.ts` | Create | `petSolanaService.getPets(program)`, `.registerPet(program, data)` |
| `web-app/src/pets/services/petService.ts` | Modify | Keep `IPetService` for mock/rest compat |
| `web-app/src/pets/hooks/usePetsOverview.ts` | Modify | Add solana path + loading/error/empty states |
| `web-app/src/pets/types/pet.ts` | Modify | Add `breed` field; align `id` as string (parsed from Pubkey) |
| `web-app/src/pets/components/RegisterPetForm.tsx` | Create | Extracted form with tx state machine |
| `web-app/src/pets/components/PetOverview.tsx` | Modify | Adapt to on-chain fields (show caretaker, species) |
| `web-app/src/pets/views/PetsOverviewView.tsx` | Modify | Use new hook signature, remove inline form |
| `web-app/src/pets/pages/PetsOverview.tsx` | Modify | Pass loading/error/empty to view |
| `web-app/src/appoinments/` | Rename | → `appointments/` |
| `web-app/src/appointments/types/medicalAppointment.ts` | Modify | Align with on-chain `MedicalAppointment` |
| `web-app/src/appointments/services/solana/appointmentService.ts` | Create | On-chain appointment service |
| `web-app/src/appointments/hooks/useAppointments.ts` | Create | Fetch appointments from chain |
| `web-app/src/appointments/components/` | Create | Appointment list, schedule, pay, check-in UIs |
| `web-app/src/common/components/NavBar.tsx` | Modify | Fix `appoinments` → `appointments` href + `<Link>` |
| `web-app/src/common/hooks/useTxState.ts` | Create | Transaction state machine hook |
| `web-app/src/__tests__/solana/pda.test.ts` | Create | PDA derivation tests |
| `web-app/src/__tests__/solana/petSolanaService.test.ts` | Create | Service unit tests with mocked program |
| `web-app/src/__tests__/pets/usePetsOverview.test.ts` | Create | Hook tests |
| `web-app/src/__tests__/pets/RegisterPetForm.test.ts` | Create | Component tests with tx flow |
| `web-app/src/__tests__/setup.ts` | Create | Vitest setup (`@testing-library/jest-dom`) |

## Interfaces / Contracts

### Transaction State Machine

```typescript
type TxStep = 'idle' | 'wallet-approval' | 'sending' | 'confirmed';

type TxState =
  | { status: 'idle' }
  | { status: 'pending'; step: TxStep }
  | { status: 'confirmed'; signature: string }
  | { status: 'error'; error: string };

interface UseTxStateReturn {
  state: TxState;
  execute: (fn: () => Promise<string>) => Promise<void>;
  reset: () => void;
}
```

### Service Interfaces

```typescript
// petSolanaService — function-based, stateless
import type { Program } from "@coral-xyz/anchor";
import type { Vet57b } from "../../../solana/types/vet_57b";
import type { Pet } from "../../types/pet";
import type { PublicKey } from "@solana/web3.js";

export interface RegisterPetData {
  name: string;
  age: number;
  animalType: { dog: Record<string, never> } | { cat: Record<string, never> };
  caretakerName: string;
  caretakerPhone: string;
}

export const petSolanaService = {
  getPets: (program: Program<Vet57b>): Promise<Pet[]>,
  registerPet: (program: Program<Vet57b>, data: RegisterPetData, authority: PublicKey): Promise<string>,
};
```

### Type Mapping

| Web-App `Pet` | On-Chain `MedicalRecord` (Anchor decoded) | Bridge Function |
|---------------|-------------------------------------------|----------------|
| `id: string` | `id: PublicKey` (decoded `Pubkey`) | `pet.id = record.id.toBase58()` |
| `name: string` | `name: string` | Direct |
| `animalType: 'Dog' \| 'Cat'` | `animalType: { dog: {} } \| { cat: {} }` | `animalTypeToRecord(type)` / `recordToAnimalType(animalType)` |
| `age: number` | `age: number` | Direct (u8 fits in number) |
| `caretakerName: string` | `caretakerName: string` | Direct |
| `caretakerPhone: string` | `caretakerPhone: string` | Direct |

### PDA Derivation

```typescript
// solana/pda.ts — matches Rust seeds exactly
export function deriveMedicalRecordAddress(id: PublicKey, programId: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('medical-record'), id.toBuffer()],
    programId,
  );
  return address;
}

export function deriveMedicalAppointmentAddress(id: PublicKey, programId: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('medical-appointment'), id.toBuffer()],
    programId,
  );
  return address;
}

export function derivePetCheckinAddress(
  medicalRecord: PublicKey, id: PublicKey, programId: PublicKey,
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from('pet-checkin'), medicalRecord.toBuffer(), id.toBuffer()],
    programId,
  );
  return address;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `pda.ts` derivation | Call with known inputs, assert output matches expected PDAs |
| Unit | `petSolanaService.ts` | Mock `program.account.medicalRecord.all()` and `program.methods.registerPet` |
| Unit | `useTxState.ts` | Test state transitions: idle→pending→confirmed, idle→error, reset |
| Component | `RegisterPetForm.tsx` | Mock `useVetProgram` + `useTxState`; test validation, rendering, submit flow |
| Component | `PetOverview.tsx` | Render with mock on-chain data |
| Hook | `usePetsOverview.ts` | Mock service layer; test loading→data, loading→error, and empty states |
| Hook | `useVetProgram.ts` | Mock wallet adapter context; test returns program when connected, null when not |

**What NOT to test**: Anchor program internals, wallet-adapter internals, Solana RPC behavior.

**Mock strategy**: Vitest `vi.mock()` for `@coral-xyz/anchor` and wallet adapter hooks. A `mockProgram` factory that returns a typed `Program<Vet57b>` with `mockResolvedValue` on account fetchers and method builders.

## Migration / Rollout

No migration required — the web-app currently uses mock data by default (`VITE_USE_MOCK_DATA=true`). The env switch continues to work: `false` → mock, `true` → solana. The REST service (`AxiosPetService`) is not removed — deprecated but kept for reference.

Rollback: `git revert` the merge commit, restore `package.json`, delete Vitest config and `solana/` directory.

## Open Questions

- [ ] Should we keep `AxiosPetService` as a fallback or remove it to avoid dead code? (Proposal says "deprecated, not improved" — leave it)
- [ ] Appointments pages don't exist yet in the router — placeholder pages or fully-featured? (Specs exist for appointments as part of this change)
