---
date: "2026-04-20"
phase: 2.5
status: decision
tags:
  - phase-2.5c
  - biomarker
  - reclassify
  - admin-portal
  - data-integrity
---

# Decision — `rangesSignature` and `affectedPatientCount` are computed together and invalidated together

**Date:** 2026-04-20
**Phase:** 2.5C brainstorm
**Status:** Approved by founder during Plan 2.5C brainstorm.

## Decision

The `reclassifyAllReports({ mode: "preview" })` action returns a single coupled payload whose fields all derive from the same database snapshot:

```ts
{
  totalValues: number,                        // values scanned
  wouldChange: number,                        // values whose band would flip
  byTransition: Record<string, number>,       // dynamic keys; only observed transitions
  byMarker: Array<{ canonicalId, displayName, changeCount }>,
  affectedReports: number,                    // biomarker_reports with ≥1 would-change value
  affectedPatientCount: number,               // unique users across affectedReports
  rangesSignature: string,                    // MAX(updatedAt) over biomarker_reference_ranges
  previewedAt: number,
}
```

`affectedPatientCount` is NOT computed client-side or during commit. It's part of the preview payload, computed from the same iteration pass that produces the other fields.

The commit handler receives `{ mode: "commit", rangesSignature }`. Server re-reads `MAX(updatedAt)` over `biomarker_reference_ranges`; if `currentSignature !== passedSignature`, throws `ranges_changed_since_preview`. Admin must re-preview before commit.

When `rangesSignature` is invalid, **the entire preview payload is invalid** — including `affectedPatientCount`. The admin UI discards the full preview on staleness and re-renders the idle state.

## Alternatives considered

1. **Client computes `affectedPatientCount` from `affectedReports` via a separate query.** Rejected. The separate query runs against a later DB snapshot — a patient may have soft-deleted a report between preview and count-query, causing the count shown in the commit dialog to disagree with the actual commit impact.

2. **Commit dialog shows `affectedReports` only; no patient count.** Rejected. The commit dialog body explicitly says "N patients will receive `lab_report_updated` notifications." Dropping the patient number removes information the admin needs to decide. "47 reports will update" is less informative than "47 reports across 39 patients will update."

3. **`rangesSignature` validated but `affectedPatientCount` allowed to drift.** Rejected. Subtle: preview shows "39 patients affected," ranges edit races in, commit fires against different ranges, actually affects 42 patients. The admin approved 39; 42 got notifications. That's an integrity violation — the confirmation shown is a lie.

4. **Lock ranges entirely during preview.** Rejected. A 10–30 second read-only preview shouldn't block all range writes. The signature-check pattern is lighter-weight and catches the same races.

## Why

The admin's consent target (what they're approving) must match the commit's execution target (what actually happens). If any part of the preview payload can drift relative to commit state, the consent is meaningless. The simplest way to guarantee no-drift is: **one snapshot produces every number; a signature check invalidates every number together; no partial validation paths exist.**

## How to apply

1. **Preview action reads `biomarker_reference_ranges` once**, caches results in action-local memory, computes every field of the payload from that single read. No re-queries.
2. **`affectedPatientCount` is a `SELECT COUNT(DISTINCT userId)` equivalent** over the values that would change — computed in the same iteration pass. Not a separate query.
3. **`rangesSignature` is captured at the start of the iteration pass.** Even if a range edit lands mid-iteration, the signature reflects the state the iteration read.
4. **Commit handler validates signature BEFORE acquiring the global reclassify lock.** No writes happen until the signature passes.
5. **Admin UI state machine** has exactly three states: `idle` (no preview), `preview-valid` (preview matches current signature), `preview-stale` (preview predates a range edit). There is no `commit-in-flight-with-stale-preview` state — if staleness is detected on commit, the handler throws and the UI falls back to `idle`.
6. **Commit dialog** reads every number from the cached preview payload. None of the numbers in the dialog body are computed at render time from a fresh query.
7. **Audit log entries** for `reclassify_all_preview` and `reclassify_all_commit` both include the `rangesSignature` and `affectedPatientCount` they acted on. Phase 5 audit viewer can correlate preview→commit pairs by signature.

## Known risks

- **Race between signature read and commit write.** Theoretically a range edit lands between the commit handler's signature check and its lock acquisition. Closing this window would require serializing range edits against reclassify commits via a stronger lock. Acceptable risk because: (a) admin surface is low-volume, two simultaneous ops are rare; (b) the second edit would trigger its own `reclassifyForCanonicalId` which runs on the updated ranges; (c) the `admin_audit_log` captures the actual signature acted on, so post-hoc investigation is possible.
- **Signature granularity.** `MAX(updatedAt)` flags any edit, even one that doesn't affect classification outcomes (e.g., editing the `explainer` text). Admin must re-preview for pure-prose edits too. Accepted — the false-positive is harmless; the false-negative would not be.
- **Preview-only audit entries accumulate.** Every preview writes an audit row whether committed or not. At admin cadence this is fine; if it ever becomes noise, we can drop preview-audit to a feature flag. Not today.

## Reversibility

Decoupling the fields post-hoc would be a data-integrity regression. No realistic scenario makes this worth reversing.
