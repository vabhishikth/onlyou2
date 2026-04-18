---
date: "2026-04-18"
phase: 2.5a
status: accepted
tags:
  - clinical
  - biomarker
  - seed-validation
  - phase-2.5a
---

# Biomarker threshold invariant — action bounds use `≤`, not `<`

**Context:** Phase 2.5A seeded 45 reference-range rows across 32 canonical markers. The threshold schema has six bounds per row (where present): `actionBelow`, `subOptimalBelowMin`, `optimalMin`, `optimalMax`, `subOptimalAboveMax`, `actionAbove`. The plan's README described the ordering invariant as strict `<` across all six. The seed data, transcribed from clinical guidelines, has `actionBelow == subOptimalBelowMin` and `subOptimalAboveMax == actionAbove` on every row with those bounds defined.

## Decision

The threshold invariant enforced by `convex/__tests__/biomarker/seed-validation.test.ts` is:

```
actionBelow  ≤  subOptimalBelowMin  <  optimalMin  ≤  optimalMax  <  subOptimalAboveMax  ≤  actionAbove
```

The **inner** comparisons (`subOptimalBelowMin < optimalMin` and `optimalMax < subOptimalAboveMax`) remain strict. The **action-bound** comparisons on the extreme edges use `≤` — the "sub-optimal" and "action" tiers are allowed to coincide.

## Why

1. **Clinical-guideline reality.** Most of the authoritative sources consulted (Endocrine Society, ADA 2024, AACC, WHO) define a single "abnormal / requires clinical action" cutoff without an intermediate "sub-optimal" band at the extreme edge. The value where a marker becomes "worth flagging to the clinician" is the same value where it becomes "requires action." Forcing a gap between them would be clinical fabrication.

2. **Data is the authoritative clinical content.** The README invariant text was descriptive prose written by the plan author before the seed was transcribed. When the two conflicted, the data — which cites specific guidelines per row — won.

3. **Classification still works correctly.** A marker with value `v` where `v ≤ actionBelow == subOptimalBelowMin` classifies as `action_required` (the stricter category), not `sub_optimal`. The classifier checks action bounds first, so the tie does not produce ambiguous classification.

## Consequences

- **Clinical advisor audit:** when the clinical reviewer audits the 45 DRAFT rows, they will see `actionBelow == subOptimalBelowMin` on every row that has both. This is intentional, not a transcription error. The advisor is free to _widen_ the gap on any specific marker if the clinical literature supports a distinct sub-optimal band — that's a row-level edit, not a systemic correction.

- **Parse-pipeline tests (2.5B+):** classification assertions must treat the tie case as `action_required`, not `sub_optimal`. Fixture reports should include at least one marker hitting the tied bound to lock this behaviour in a test.

- **Seed validation enforces the relaxed invariant.** `seed-validation.test.ts` line-by-line verifies `actionBelow <= subOptimalBelowMin` and `subOptimalAboveMax <= actionAbove`. It would fail if a future row author mistakenly flips the order.

- **README matches.** `packages/core/seeds/README.md` documents the `≤` invariant with the clinical rationale inline, so future editors don't wonder.

## References

- `packages/core/seeds/biomarker-ranges.json` — the 45 rows with tied action bounds.
- `convex/__tests__/biomarker/seed-validation.test.ts` — the enforced invariant.
- `packages/core/seeds/README.md` — editor-facing documentation of the `≤` rule.
- [[decisions/2026-04-18-phase-2.5a-as-built]] — retro mention.
