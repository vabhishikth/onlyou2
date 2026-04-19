# Reference range review — ONLYOU biomarker module

**What we need from you:** sign-off (or corrections) on the 45 reference ranges the ONLYOU app uses to classify patient lab results as **optimal / sub-optimal / action required**.

**Your time commitment:** ~2–4 hours, at your pace. No meetings required.

---

## Context

ONLYOU is an India-first telehealth platform for stigmatized chronic conditions. When a patient uploads a lab report PDF, we extract each biomarker (TSH, Vitamin D, HbA1c, etc.) and classify the value against a reference range. The classification drives:

- a coloured status badge the patient sees in the app (🟢 optimal / 🟡 sub-optimal / 🔴 action required),
- a plain-English explainer shown alongside the number,
- whether the value is flagged for the doctor in the next consultation.

**Wrong thresholds = wrong advice + potential harm.** Before any of this reaches real patients, a licensed clinician needs to vet each range.

---

## What's in the CSV

45 rows across 8 categories:

- **Nutrient Health** — 7 rows
- **Thyroid** — 3 rows
- **Metabolic** — 4 rows
- **CBC** — 5 rows
- **Hormonal Balance** — 17 rows
- **Lipids** — 5 rows
- **Liver** — 2 rows
- **Kidney** — 2 rows

27 rows are sex-specific (separate male/female rows for the same marker). 19 rows are marked pregnancy-sensitive and should not be applied to pregnant patients (the app auto-skips classification for those).

## Columns you fill in

Each row has three empty columns at the right:

1. **Approve as-is? (Y/N)** — Y if our numbers are fine for the Indian adult population. N if any number needs to change.
2. **Corrected values (if any)** — e.g. "Optimal 30–100 → 25–80; sub-optimal below 25; action below 20."
3. **Notes** — anything you want us to know. Population caveats ("only for non-diabetic adults"), source you prefer over ours, edge cases.

## How to open the CSV

- **Google Sheets:** File → Import → Upload → the CSV → "Replace spreadsheet" → Import.
- **Excel:** just open it.
- **Notion:** create a new database → "..." → Merge with CSV.

## What happens after you send it back

1. We update each approved row's `clinicalReviewer` field to your name and stamp `reviewedAt` with the date.
2. Rows you corrected get the new numbers applied before the stamp.
3. Only signed-off rows get loaded into the production database. Unreviewed rows stay in dev.

## Context you might want

- Patient population: Indian adults aged 18+, both sexes.
- Stigmatized chronic conditions in scope: hair loss, erectile dysfunction, premature ejaculation, weight management, PCOS.
- Most patients will be bringing lab reports from Dr Lal, Metropolis, Thyrocare, SRL, or Apollo Diagnostics.
- Our sources (listed in column "Our source") are international — we specifically want Indian-context corrections where relevant (e.g. Vitamin D and B12 references differ for South Asian populations).

## Questions?

Contact: v.abhishikth@gmail.com

---

_File generated: 2026-04-19. Regenerated from `packages/core/seeds/biomarker-ranges.json` — if you see a different row count, the source of truth has drifted; re-run `pnpm tsx scripts/export-ranges-for-review.ts`._
