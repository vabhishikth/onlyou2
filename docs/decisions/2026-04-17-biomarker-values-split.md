---
date: "2026-04-17"
phase: 2.5
status: decision
tags:
  - schema
  - architecture
  - phase-2.5
---

# Decision — Split `biomarker_values` into its own table

**Date:** 2026-04-17
**Phase:** 2.5 brainstorm
**Spec reference:** [[superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design|Phase 2.5 design spec]] §2.3, §2.4

## Decision

`biomarker_reports` stores the envelope only (narrative, counts, analyzedAt, pointer to `lab_reports`). Per-marker data lives in a separate table `biomarker_values`, one row per extracted marker. Indexed by:

- `by_report` (single-report render)
- `by_user_canonical_date` (per-marker trend chart)
- `by_canonical_status` (curation backfill — find all unclassified rows for a canonicalId)
- `by_report_canonical` (dedup guard during parse)
- `by_deleted` (soft-delete cron)

## Why

The initial draft embedded markers as an array on `biomarker_reports`. That design was defended with "markers are only read as a whole report, never queried across reports." The defense does not reflect the product spec:

1. **Per-marker trend chart** (marker deep-dive screen, §5.5 of spec) queries across reports by `(userId, canonicalId)` in chronological order. This is a product pillar, not an edge case.
2. **Curation backfill** (§7.6 of spec) queries all values with a given `canonicalId` and `status = "unclassified"` to reclassify them when a reference-range row is added. Another cross-report query by marker.
3. **Future analytics** (post-foundation dashboard, doctor-facing trends) will hit the same pattern.

Embedded markers would force a table scan + in-memory filter for every one of these reads. Splitting into a dedicated table with `by_user_canonical_date` + `by_canonical_status` indexes turns the hot queries into indexed lookups with O(log N + k) cost instead of O(N × avg markers per report).

## Tradeoffs accepted

- **Two round-trips per report render instead of one.** `biomarker_reports.by_lab_report` for the envelope + `biomarker_values.by_report` for the markers. Still constant-time per report.
- **Denormalized `userId` + `collectionDate` on `biomarker_values`.** Required so the trend index doesn't join back to the envelope. Kept consistent by the parse and cascade-soft-delete paths. Documented invariant.
- **Slightly larger total row count.** One typical report = 1 envelope + 8–40 values. A patient with 5 reports = ~125 rows. Well within Convex norms.

## Cascade soft-delete across envelope + values

See §2.11 of spec. Single `deleteLabReport` mutation sets `deletedAt` on `lab_report`, owning `biomarker_report`s, AND all owning `biomarker_values` in one transaction. Reads filter `deletedAt == null`. Daily cron purges day-30-old rows child-first (values → reports → lab_reports) and nulls dangling notification pointers. Documented so nobody re-invents partial-delete semantics.

## How to apply

- Every future schema decision engages the actual hot queries, not an abstract "it's usually read as a whole." Product spec drives index design.
- Denormalized fields (`userId` + `collectionDate` on `biomarker_values`) must be written consistently by every mutation that creates or updates a value row. Invariant guarded by integration tests.
- If new cross-report queries emerge (e.g., "all patients whose LDL flipped from sub-optimal to action in the last 30 days" for admin analytics), they should add indexes on `biomarker_values`, not re-normalize onto the envelope.

## Reversibility

Low. If we embedded markers and later needed indexed cross-report queries, the migration would require moving all existing data from the array into rows with backfilled `userId` and `collectionDate`. Cheaper to start with the split.
