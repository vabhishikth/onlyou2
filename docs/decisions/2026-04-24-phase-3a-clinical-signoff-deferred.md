# Clinical sign-off on 45 reference ranges — deferred to pre-prod gate

**Date:** 2026-04-24
**Phase:** 3A hardening
**Status:** Deferred

## Context

Phase 3A scope (per `docs/superpowers/specs/2026-04-24-phase-3-hair-loss-e2e-design.md` §3) listed sign-off on the 45 `biomarker_reference_ranges` rows as one of five unblockers. The plan (`docs/superpowers/plans/2026-04-24-phase-3a-hardening.md` Task 9) proposed:

1. Generate advisor review packet.
2. Apply advisor edits.
3. Stamp all 45 rows with `clinicalReviewer` + `reviewedAt`.
4. Add a seed-validation assertion that fails CI if any row reverts to `DRAFT`.

## Decision

Steps 1 is **done** — packet at `docs/clinical-review/biomarker-ranges-for-review.csv` + `README-for-reviewer.md` regenerated 2026-04-24.

Steps 2–4 are **deferred** to the pre-prod gate (Phase 8 launch). Rationale:

- Phase 2.5C checkpoint already framed advisor sign-off as a "prod-seed prerequisite," not a Phase-3A merge prerequisite. Phase 3A ships the security hardening + phone normalisation + guard helpers that unblock Phase 3B development; advisor sign-off is orthogonal.
- 45 ranges currently carry `clinicalReviewer: "DRAFT — pending review"`. Dev + staging use these ranges unchanged until advisor reply lands. No patient-facing traffic runs against dev ranges.
- Locking the assertion now (`!== "DRAFT"`) would red the whole suite for weeks without a clear triggering event.

## How to resume

1. Send `docs/clinical-review/biomarker-ranges-for-review.csv` + cover letter to advisor.
2. On reply: apply corrections row-by-row to `packages/core/seeds/biomarker-ranges.json`.
3. Stamp every row:
   ```bash
   REVIEWER_NAME="Dr. <Name>, MBBS MD — reviewed YYYY-MM-DD" \
     REVIEWED_AT_ISO="YYYY-MM-DDTHH:MM:SS+05:30" \
     node -e '…' # stamping one-liner per plan Task 9 Step 4
   ```
4. Add the seed-validation assertion (see plan Task 9 Step 5) so any future DRAFT insertion fails CI.
5. Write an as-built decision record (`docs/decisions/YYYY-MM-DD-clinical-signoff-complete.md`).
6. Run `pnpm seed:biomarker-ranges` against the prod Convex deployment.

## Gate

Pre-prod seed (Phase 8) MUST NOT run until steps 2–5 above are complete.

## Tracking

Entry added to `docs/DEFERRED.md` under Phase 8 with this decision record as the reference.
