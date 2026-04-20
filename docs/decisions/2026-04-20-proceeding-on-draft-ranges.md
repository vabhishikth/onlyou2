# Proceeding on DRAFT biomarker reference ranges pending clinical review

**Date:** 2026-04-20
**Status:** Accepted
**Phase context:** Phase 2.5B merged 2026-04-18; Plan 2.5C (ingestion + curation + portal contracts) brainstorm next. 2.5D is the final Phase 2.5 approval-gate plan.

## Context

All 45 rows in `packages/core/seeds/biomarker-ranges.json` currently carry `clinicalReviewer: "DRAFT — pending review"` and `reviewedAt: null`. A licensed clinician was sent `docs/clinical-review/biomarker-ranges-for-review.csv` with `docs/clinical-review/README-for-reviewer.md` on 2026-04-19; the return is taking time.

Unblocking the build requires a decision: wait for the clinician, or proceed on DRAFT ranges with a disciplined swap procedure when the review lands.

## Decision

**Proceed on DRAFT ranges across Plans 2.5C and 2.5D. Swap to reviewed ranges as soon as the clinician returns, via a data-only update — no code, no re-parse.**

This is safe because the 2.5A/2.5B architecture already separates the three things that would otherwise couple:

1. **Extraction output is stored as raw numeric values**, not as band classifications. `biomarker_values.numericValue` is the source of truth; `status` is a derived field.
2. **Every value row points at the specific `biomarker_reference_ranges` row it was classified against** via `referenceRangeId`. Swap the range row → reclassify by following the pointer.
3. **`biomarker_reports.lastReclassifiedAt` is already in the schema**, anticipating exactly this operation.

Production deploys are already blocked while any row is unreviewed — `scripts/seed-biomarker-ranges.ts` hard-fails on a prod deployment when `clinicalReviewer === "DRAFT — pending review"`, regardless of `ALLOW_UNREVIEWED_RANGES`. There is no path for DRAFT ranges to reach real patients.

## The swap procedure (when the clinician returns)

1. Apply the clinician's corrections to `packages/core/seeds/biomarker-ranges.json`. Stamp each approved row:
   - `clinicalReviewer: "<Name, Credentials>"`
   - `reviewedAt: <unix-ms of return date>`
2. Run `pnpm seed:biomarker-ranges` against dev Convex (no `ALLOW_UNREVIEWED_RANGES` needed once all rows are signed off). Seeder upserts by `(canonicalId, sex, ageMin)` — existing range rows update in place; new rows insert.
3. Run an internal `reclassifyAllReports` mutation (to be shipped in Plan 2.5C or 2.5D — see `docs/DEFERRED.md`) that iterates every non-deleted `biomarker_values` row, re-executes `classifyRow` against the current ranges, updates `status` + `unclassifiedReason` if changed, and stamps `lastReclassifiedAt` on the parent report.
4. Verify via E2E test case (see below).
5. Deploy to prod. The seeder's unreviewed-row guard now lets the deploy through.

## What could go wrong (mitigations)

| Risk                                                                             | Mitigation                                                                                                                                                       |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A patient opens the app while reclassify is mid-run and sees mixed old/new bands | Reclassify runs server-side in a single batched mutation; reports update atomically per report. Client sees the new classification on next query refresh.        |
| Reviewer adds **new** age-stratified rows (e.g. 18–49 vs 50+ split for TSH)      | Range-matching code in `convex/lib/classifyRow.ts` already picks the narrowest `(sex, ageMin)` match. New rows land cleanly; existing rows stay unique by index. |
| Reviewer flags a marker as pregnancy-distinct needing its own range              | Adding a pregnancy-variant row is a seed edit — schema already has `pregnancySensitive` boolean; pregnancy guard in classifier unchanged.                        |
| Swap leaves some rows DRAFT (reviewer only returns partial)                      | Seeder's unreviewed-row check still fires in dev (requires `ALLOW_UNREVIEWED_RANGES`) and hard-blocks prod. Partial review is self-flagging.                     |

## What this decision is NOT

- **Not** a commitment to ship DRAFT ranges to production. The seeder guard makes that architecturally impossible.
- **Not** a delay to the clinical review. The review is the gate for prod; build continues in parallel.
- **Not** a change to the schema. Every piece needed for the swap is already in place from 2.5A/2.5B.

## E2E test case (documented for when real values arrive)

See `docs/DEFERRED.md` → Phase 2.5 round-trip entry. One-line summary: upload a fixture report on DRAFT ranges → assert current band classifications → replace seed JSON with the reviewed ranges → re-run seeder → invoke reclassify → assert any marker whose threshold moved flips to the correct band and `lastReclassifiedAt` is stamped.

## References

- Schema: `convex/schema.ts` (`biomarker_values`, `biomarker_reports`, `biomarker_reference_ranges`)
- Seeder: `scripts/seed-biomarker-ranges.ts` (prod guard at lines 160–183)
- Clinical review package: `docs/clinical-review/README-for-reviewer.md`, `docs/clinical-review/biomarker-ranges-for-review.csv`
- Sent on 2026-04-19 per checkpoint; return date unknown.
