# Archive Report: Change 1 — Solana Program + TS Client + Tests

**Change**: change-1-solana
**Project**: vet-57b-solana
**Archived**: 2026-05-26
**Mode**: hybrid (Engram + Filesystem)

## Artifact Traceability

| Artifact | Engram Observation ID |
|----------|----------------------|
| Proposal | #135 (topic: `sdd/change-1-solana/proposal`) |
| Spec (Delta) | #136 (topic: `sdd/change-1-solana/spec`) |
| Design | #137 (topic: `sdd/change-1-solana/design`) |
| Tasks | #138 (topic: `sdd/change-1-solana/tasks`) |
| Apply Progress | #139 (topic: `sdd/change-1-solana/apply-progress`) |
| Verify Report | #141 (topic: `sdd/change-1-solana/verify-report`) |
| Archive Report | This document (topic: `sdd/change-1-solana/archive-report`) |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| medical-record | Created | Copied delta spec → `openspec/specs/medical-record/spec.md` (4 requirements, 4 scenarios) |
| medical-appointment | Created | Copied delta spec → `openspec/specs/medical-appointment/spec.md` (2 requirements, 6 scenarios) |
| pet-checkin | Created | Copied delta spec → `openspec/specs/pet-checkin/spec.md` (1 requirement, 3 scenarios) |

> **Note**: Specs reflect the *planned* design. The verify report (#141) documents a known seed divergence between the spec (owner-based seeds) and the implementation (single-Pubkey seeds). This was flagged as a documentation gap, not a code defect.

## Archive Contents

| Artifact | File | Status |
|----------|------|--------|
| Proposal | `proposal.md` | ✅ |
| Specs | `specs/medical-record/spec.md` | ✅ |
| Specs | `specs/medical-appointment/spec.md` | ✅ |
| Specs | `specs/pet-checkin/spec.md` | ✅ |
| Design | `design.md` | ✅ |
| Tasks | `tasks.md` | ✅ |
| Verify Report | `verify-report.md` | ✅ |
| Archive Report | `archive-report.md` | ✅ |

## Task Completion

| Phase | Tasks | Completed | Status |
|-------|-------|-----------|--------|
| 1. Solana Program (Rust) | 6 | 6 | ✅ Complete |
| 2. TS Client (Models + Wrapper) | 5 | 5 | ✅ Complete |
| 3. Test Helpers | 4 | 4 | ✅ Complete |
| 4. Test Suites | 4 | 4 | ✅ Complete |
| **Total** | **19** | **19** | ✅ Complete |

All 19 tasks were implemented across 3 chained PRs (PR 1: Rust core, PR 2: TS client, PR 3: Tests).

## Verification Verdict

**PASS WITH WARNINGS** (no CRITICAL issues)

Verification report ID: #141
Mode: Static (no anchor CLI available for runtime execution)

## Source of Truth Updated

The following main specs now reflect the new capabilities:
- `openspec/specs/medical-record/spec.md` — Medical record creation and storage
- `openspec/specs/medical-appointment/spec.md` — Appointment scheduling and payments
- `openspec/specs/pet-checkin/spec.md` — Pet arrival check-in

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.

## Open Items (from Verify Report)

1. **Dead error codes**: 4/5 `Vet57bError` variants (`PetAlreadyRegistered`, `AppointmentAlreadyExists`, `CheckinAlreadyExists`, `MedicalRecordNotFound`) are defined but unused. Duplicate detection relies on Anchor's built-in `init` constraint.
2. **Spec seed documentation gap**: Specs reference owner-based PDA seeds; implementation uses single-Pubkey seeds. Consider updating specs in a follow-up change.
3. **TS event interface types**: `MedicalAppointmentCreatedEvent` uses `string`/`Date`/`number` instead of Anchor's `Pubkey`/`BN`/`BN`.
