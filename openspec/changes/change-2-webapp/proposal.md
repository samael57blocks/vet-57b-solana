# Proposal: Change 2 — Web-App On-Chain Features

## Intent

Connect the React web-app to the Solana Anchor program built in Change 1. Currently the web-app has zero blockchain dependencies — all data flows through mock/REST services. This change wires the frontend to real on-chain accounts and instructions via wallet-adapter + Anchor provider.

## Scope

### In Scope
- Vitest + @testing-library/react setup with TDD workflow for web-app
- Wallet infrastructure: `@solana/wallet-adapter-*` + `@coral-xyz/anchor` provider
- Typed React hooks: `useVetProgram`, `useAnchorProvider`, `usePetsOverview` (on-chain)
- Solana services per feature (pets, appointments, check-in) following existing service pattern
- UI updates: register pet form, list pets from chain, schedule/pay appointment, check-in
- Fix `appoinments` → `appointments` directory typo
- Transaction state feedback (idle → pending → confirmed → success/error)

### Out of Scope
- Backend/REST service (removed or deprecated, not improved)
- CI/CD pipeline changes
- New UI features beyond what exists in current components
- Solana program changes (Change 1 is archived, frozen)
- Web-app end-to-end tests (unit + component tests only)
- Optimistic updates (on-chain state is authoritative)

## Capabilities

> No spec-level changes. Existing specs (`medical-record`, `medical-appointment`, `pet-checkin`) already describe the on-chain behaviors. This change adds the web-app UI layer connecting to those capabilities — pure implementation.

### New Capabilities
None — pure implementation change, no spec-level behavior changes.

### Modified Capabilities
None — existing specs are unchanged.

## Approach

1. **Test infra**: Install Vitest and configure `vitest.config.ts`. Create `src/__tests__/` structure.
2. **Wallet infra**: Wrap app in `ConnectionProvider` → `WalletProvider` → `AnchorProvider`. Add `.env` for RPC URL.
3. **Typed hooks**: `useAnchorProvider` (create Anchor provider from wallet context), `useVetProgram` (typed `Program<Vet57b>` from IDL). Copy IDL JSON and `vet_57b.ts` types into web-app.
4. **Solana services**: `petSolanaService` replaces `petService` mock — implements `getPets` (fetch all MedicalRecord accounts) and `registerPet` (send tx). Same pattern for appointments & check-in.
5. **UI updates**: `PetsOverviewView` → call on-chain service, `RegisterPetForm` → send tx, wire wallet connect button, appointment list from chain.
6. **Fix typo**: Rename `appoinments/` to `appointments/`.
7. **Transaction states**: `Idle → Pending(Wallet) → Confirmed → Success/Error` in every write path.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web-app/package.json` | Modified | Add Solana + Anchor + Vitest deps |
| `web-app/vite.config.ts` | Modified | Add Vitest config |
| `web-app/tsconfig.app.json` | Modified | Add `resolveJsonModule`, `types` for vitest |
| `web-app/.env` | New | `VITE_SOLANA_RPC_URL`, `VITE_PROGRAM_ID` |
| `web-app/src/solana/` | New | Provider, hooks, program types directory |
| `web-app/src/solana/provider.tsx` | New | `AnchorProvider` React context |
| `web-app/src/solana/useVetProgram.ts` | New | Typed `Program<Vet57b>` hook |
| `web-app/src/solana/useAnchorProvider.ts` | New | Anchor provider from wallet-adapter |
| `web-app/src/solana/types/vet_57b.ts` | New | Copied from `solana/target/types/` |
| `web-app/src/solana/idl/vet_57b.json` | New | Copied from `solana/target/idl/` |
| `web-app/src/pets/services/solana/petService.ts` | New | On-chain pet service |
| `web-app/src/pets/hooks/usePetsOverview.ts` | Modified | Switch to solana service |
| `web-app/src/pets/services/petService.ts` | Modified | Add solana implementation |
| `web-app/src/pets/types/pet.ts` | Modified | Align with on-chain `MedicalRecord` (BN ids) |
| `web-app/src/pets/components/PetOverview.tsx` | Modified | Adapt to on-chain types |
| `web-app/src/pets/components/RegisterPetForm.tsx` | New | Form to call `registerPet` |
| `web-app/src/pets/pages/PetsOverview.tsx` | Modified | Add wallet connect + register UI |
| `web-app/src/appoinments/` | Renamed | Fix typo → `appointments/` |
| `web-app/src/appointments/services/solana/` | New | On-chain appointment service |
| `web-app/src/appointments/hooks/useAppointments.ts` | New | Fetch appointments from chain |
| `web-app/src/appointments/components/` | New | Appointment list + pay + schedule |
| `web-app/src/common/components/NavBar.tsx` | Modified | Fix typo href |
| `web-app/src/App.tsx` | Modified | Wrap with providers |
| `web-app/src/main.tsx` | Modified | Add providers |
| `web-app/src/router.tsx` | Modified | Add appointment routes |
| `web-app/vitest.config.ts` | New | Vitest configuration |
| `web-app/src/__tests__/` | New | Test files for hooks + services |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@coral-xyz/anchor` 0.30.1 incompatible with `@solana/web3.js` v1.x | Low | Pin exact versions per exploration findings |
| `verbatimModuleSyntax` blocks JSON IDL import | Med | Set `resolveJsonModule: true` + use `import * as idl` pattern |
| Wallet adapter breaking UI changes | Low | Wrap in its own provider layer; test without wallet first |
| Appointments page doesn't exist yet in router | Low | Add routes & placeholder; don't block pets feature |
| Solana program not deployed on testnet for dev | Med | Use devnet with airdrop; document localnet setup in `.env.example` |

## Dependencies

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.98.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-react-ui": "^0.9.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",
    "@coral-xyz/anchor": "^0.30.1"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^24.0.0"
  }
}
```

## Rollback Plan

Revert `web-app/package.json`, restore previous `tsconfig.app.json`, delete `web-app/src/solana/`, delete Vitest config, rename `appointments/` back to `appoinments/`. Git revert the merge commit.

## Success Criteria

- [ ] `vitest` runs with 0 failing tests for Solana hooks + services
- [ ] Wallet connect button renders and connects to Phantom/Backpack
- [ ] `usePetsOverview` fetches real `MedicalRecord` accounts from devnet
- [ ] `RegisterPetForm` submits a `registerPet` tx and confirms
- [ ] Appointments page lists on-chain `MedicalAppointment` accounts
- [ ] Appointment pay flow sends SOL and updates on-chain status
- [ ] Check-in flow calls `takePetToVet` and records timestamp
- [ ] `appoinments` typo has 0 remaining references in codebase
- [ ] `npm run build` succeeds with 0 TypeScript errors
