# Biomarker seed data

Flat JSON files that seed the `biomarker_reference_ranges` and related tables.
Human-readable; the clinical advisor reviews this file directly.

## Files

- `biomarker-ranges.json` — 32 markers × ~45 reference-range rows.
- `unit-conversions.json` — unit conversion factors used during parsing.

## Review workflow

1. PR modifies a row.
2. Clinical advisor reviews the diff (GitHub or markdown export).
3. Advisor sets `clinicalReviewer: "Dr. <Name>"` and
   `reviewedAt: "<ISO timestamp>"` on every reviewed row.
4. PR merges only when every modified row has both fields set.
5. Deploy pipeline runs `scripts/seed-biomarker-ranges.ts`. In prod the
   seeder hard-fails on any row with `clinicalReviewer` empty or set to
   `"DRAFT — pending review"`.

## Editing rules

- **Threshold invariant** (enforced by `seed-validation.test.ts`):
  `actionBelow ≤ subOptimalBelowMin < optimalMin ≤ optimalMax < subOptimalAboveMax ≤ actionAbove`
  (Action bounds use `≤` because the seed collapses action and sub-optimal thresholds
  on the lower/upper edge — both values may be equal. The inner comparisons remain strict.)
  for bounds that exist on the row.
- **`pregnancySensitive` is mandatory** on every row.
- **`source` is mandatory** — cite the specific guideline or reference.
- **Aliases are case-preserving** but matched case-insensitive at parse time;
  include common variants Indian labs print (e.g., `Vit D`, `25-OH Vitamin D`,
  `25-hydroxyvitamin D`).
- **Sex-differentiated markers** need a row per sex (or a `sex: "any"` row
  if ranges do not differ).
- **Adding a new marker** is a JSON change + re-run of the seeder script —
  NOT a code change.
