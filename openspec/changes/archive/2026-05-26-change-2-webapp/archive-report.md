## Archive Report

**Change**: change-2-webapp
**Project**: vet-57b-solana
**Archived**: 2026-05-26
**Mode**: hybrid (Engram + Filesystem)

### Artifact Traceability

| Artifact | Engram Topic Key | Engram Obs ID | File Path |
|----------|-----------------|---------------|-----------|
| Proposal | sdd/change-2-webapp/proposal | #145 | `openspec/changes/archive/2026-05-26-change-2-webapp/proposal.md` |
| Spec | sdd/change-2-webapp/spec | #146 | `openspec/changes/archive/2026-05-26-change-2-webapp/specs/` (5 domains) |
| Design | sdd/change-2-webapp/design | #148 | `openspec/changes/archive/2026-05-26-change-2-webapp/design.md` |
| Tasks | sdd/change-2-webapp/tasks | #149 | `openspec/changes/archive/2026-05-26-change-2-webapp/tasks.md` |
| Apply-progress | sdd/change-2-webapp/apply-progress | #150 | (engram only) |
| Verify-report | sdd/change-2-webapp/verify-report | #153 | `openspec/changes/archive/2026-05-26-change-2-webapp/verify-report.md` |
| Archive-report | sdd/change-2-webapp/archive-report | (this) | `openspec/changes/archive/2026-05-26-change-2-webapp/archive-report.md` |

### Implementation Summary

Connected the React web-app to the Solana Anchor program (built in Change 1) across three chained PRs. The implementation replaced mock/REST services with on-chain Solana interactions via `@solana/wallet-adapter`, `@coral-xyz/anchor`, and a typed `Program<Vet57b>` provider chain.

**PR 1** — Foundation & Infrastructure (Tasks 1-6):
- Vitest test infrastructure (vitest.config.ts, setup.ts, 2 test files)
- Solana provider chain: `ConnectionProvider → WalletProvider → AnchorProvider` in `src/solana/provider.tsx`
- Typed hooks: `useAnchorProvider`, `useVetProgram` (typed `Program<Vet57b>`)
- PDA derivation helpers in `src/solana/pda.ts`
- Transaction state machine hook `useTxState` in `src/common/hooks/`
- IDL JSON + TypeScript types from the Anchor program
- `tsconfig.app.json` configured with `resolveJsonModule` for IDL imports

**PR 2** — Services & Pets On-Chain (Tasks 7-17):
- Solana service wrappers for on-chain instructions: `petService.ts`, `appointmentService.ts`, `checkinService.ts`
- `RegisterPetForm` component with full validation and Idle→Pending→Confirmed→Success/Error transaction flow
- `PetOverview` and `PetsOverviewView` connected to on-chain `MedicalRecord` accounts
- `usePetsOverview` hook with loading/empty/error states
- Pet type mapping: `string` ↔ `PublicKey`, Anchor enum encoding for species
- 3 test files: services, usePetsOverview hook, RegisterPetForm component

**PR 3** — Appointments Feature & Integration (Tasks 18-25):
- `useAppointments` hook fetching on-chain `MedicalAppointment` accounts
- `AppointmentList`, `ScheduleAppointmentForm`, `PayAppointmentButton` components
- `AppointmentsOverviewView` and page with full transaction flow
- `Appointment` type definition
- Router integration: `<AppointmentsOverview>` route added
- `main.tsx` wired with `SolanaProvider` wrapping the entire app
- `appoinments` (typo) directory cleaned up — stale `medicalAppointment.ts` removed
- 2 test files: useAppointments hook, ScheduleAppointmentForm

### File Inventory

| PR | New | Modified | Deleted | Total |
|----|-----|----------|---------|-------|
| PR 1 — Foundation | 19 | 6 | 0 | 25 |
| PR 2 — Services+Pets | 7 | 5 | 0 | 12 |
| PR 3 — Appointments | 9 | 2 | 1 | 12 |
| **Total** | **35** | **13** | **1** | **49** |

**Note**: PR 1 count includes 9 `openspec/changes/change-2-webapp/` SDD artifacts (design, proposal, 5 specs, tasks, verify-report), the IDL JSON (740 lines), and TypeScript types (746 lines auto-generated).

### Verification Results

- **Verdict**: PASS
- **Tests**: 67/67 passing across 7 test files
- **Build**: `tsc -b` clean, `vite build` OK
- **Spec compliance**: 34/40 scenarios covered (85%)
- **Tasks**: 28/28 complete
- **Design decisions**: 15/15 implemented
- **Critical issues**: 0

### Delta from Original Specs

No delta. All 5 UI domain specs were new (no prior web-app UI specs existed). These were promoted from delta specs to main specs as-is.

| Domain | Action | Details |
|--------|--------|---------|
| wallet-infrastructure | Created | Full UI spec for wallet connection layer |
| pet-registration-ui | Created | Full UI spec for registerPet form |
| pet-list-ui | Created | Full UI spec for MedicalRecord list |
| appointment-management-ui | Created | Full UI spec for appointment schedule/pay |
| pet-checkin-ui | Created | Full UI spec for takePetToVet check-in |

### Open Items / Recommendations

**Non-blocking (identified in verify):**
- 6 uncovered spec scenarios (edge cases) — wallet-adapter native features (network warning, install wallet prompt), overpayment prevention UI, partial payment acceptance, no-pets state in schedule form and check-in UI. These depend on wallet-adapter or are low-priority edge cases.
- 2 verification WARNINGs and 2 SUGGESTIONs recorded — no action required for archive.
- `change-1-solana` folder remains in active `openspec/changes/` directory (already archived in `openspec/changes/archive/`) — cleanup candidate.

### Status

**ARCHIVED** ✅
