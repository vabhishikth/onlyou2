# FEATURE — Visual Biomarker Tracking

**Status:** Core product feature. Not polish, not optional.
**First specified:** 2026-04-14 (Phase 2 brainstorm)
**Visual reference:** `docs/biomarker-reference.png`
**Patient-app integration:** [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]] Addition 2

## ⚠️ Core principle — adaptive, not fixed

**The biomarker system renders whatever markers are in the report, not a pre-chosen list.**

Different lab reports contain completely different markers:

- A basic metabolic panel has 8–14 markers
- A comprehensive wellness panel has 25–40+
- A thyroid-only panel has 3–5
- A PCOS hormone panel has a totally different set (AMH, LH, FSH, prolactin, testosterone)
- A CBC has 20+ red/white cell indices

The Visual Biomarker Report must render _the contents of this specific report_. Nothing in this feature assumes a fixed marker count, a fixed marker list, or a template-driven narrative. The `report.markers[]` array is **variable-length**, always.

**Two different reports for the same patient should look different in the app.** If Sanjana uploads a PCOS hormone panel this month and a thyroid + lipid panel next month, she should see two fundamentally different Visual Biomarker Reports — each one faithful to the contents of its source report. The app is a viewer for _whatever just came back from the lab_, not a dashboard on a fixed panel.

## What it is

When a patient has lab results — either ordered by an ONLYOU doctor or uploaded from an outside lab — the app shows a **Visual Biomarker Report** instead of (or alongside) the raw PDF. The report is narrative-framed, status-badged, and trend-aware. It is the single most important UX bridge between "I got labs done" and "I understand what they mean, and what ONLYOU is doing about them."

### Design anatomy (from `docs/biomarker-reference.png`)

- **Header** — "Biomarker Report" in Playfair Display (Clinical Luxe serif).
- **Curator label** — "THE CLINICAL CURATOR" small-caps tagline.
- **Narrative paragraph** — 2–3 sentences written in plain English summarizing the overall picture ("Overall, your metabolic health is trending in the right direction.").
- **Key Markers** section with "Last updated" date.
- **Per-marker card** (repeated for each biomarker):
  - Marker name (e.g., "Vitamin D", "Total Testosterone", "Cortisol")
  - Status badge with color:
    - `OPTIMAL` — green / leaf
    - `SUB-OPTIMAL` — lavender (the Clinical Luxe accent `#9B8EC4`)
    - `ACTION REQUIRED` — warm red / gold outline
  - Category subtitle ("Nutrient Health & Metabolism", "Hormonal Balance", "Stress & Recuperation", etc.)
  - Current value with units
  - Horizontal range bar with a dot marking the current value inside the reference range
  - Trend arrow comparing to the previous report (↑ / ↓ / →)
  - "LEARN MORE" link → plain-English explainer screen
- **Download PDF report** button at the bottom.

### States

| State          | When                                                                  | What the user sees                                                               |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `analyzing`    | Immediately after upload or when the lab order transitions to `READY` | "Analyzing your report…" with a subtle shimmer on the marker cards               |
| `ready`        | Parsing complete, values extracted and classified                     | Full Visual Biomarker Report as above                                            |
| `error`        | Parsing fails, OCR cannot read, or the file is unrecognizable         | Fallback: "We couldn't parse this report automatically. Here's the PDF → [view]" |
| `first_report` | No previous report exists                                             | Trend arrows hidden, subtitle reads "This is your baseline"                      |

## How it works

### Data flow

```
┌───────────────────────────┐
│ Source (3 paths)          │
├───────────────────────────┤
│ 1. Doctor-ordered lab     │
│    (Phase 3+ nurse flow)  │
│ 2. Patient upload —       │
│    PDF / image            │
│ 3. Integrated lab API     │
│    (deferred, Phase 8+)   │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Convex file storage       │
│ lab_reports table         │
│  id, userId, source,      │
│  fileId, createdAt,       │
│  status                   │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ parseLabReport action     │
│ (Convex action, Node env) │
├───────────────────────────┤
│ a. OCR if image/scanned   │
│    PDF (Tesseract or a    │
│    hosted OCR service)    │
│ b. Claude API (already in │
│    stack) with a          │
│    structured extraction  │
│    prompt — returns JSON  │
│    of {marker, value,     │
│    unit, referenceRange}  │
│ c. Classification against │
│    reference_ranges table │
│    (age + sex + marker →  │
│    optimal / sub / action)│
│ d. Narrative generation   │
│    via Claude (2–3 line   │
│    plain-English summary) │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ biomarker_reports table   │
│  id, labReportId, userId, │
│  markers[], narrative,    │
│  analyzedAt               │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│ Patient app subscription  │
│ `profile/lab-results/[id]`│
│ renders the Visual        │
│ Biomarker Report          │
└───────────────────────────┘
```

### Reference-range knowledge

**The parser is marker-agnostic. The DB is seed-and-grow, not a whitelist.**

- New Convex table: `biomarker_reference_ranges`
  - `marker` (canonical id, e.g., `vitamin_d`, `total_testosterone`)
  - `aliases` (`string[]`) — alternative names labs use for the same marker (e.g., `25-OH Vitamin D`, `25-hydroxyvitamin D`, `Vit D (25-OH)`)
  - `unit`
  - `ageMin`, `ageMax`
  - `sex` (`male` | `female` | `any`)
  - `optimalMin`, `optimalMax`
  - `subOptimalMin`, `subOptimalMax`
  - `actionBelow`, `actionAbove`
  - `category` (e.g., `Hormonal Balance`)
  - `explainer` (Markdown, shown on "Learn more" tap)
  - `source` (citation — tracked for every row)

- **Seed at launch** is an MVP starting inventory, not a ceiling. The first seed covers ~25 common markers across the 5 verticals (vitamin D, testosterone, TSH, HbA1c, lipid panel components, CBC indices, DHEA-S, prolactin, insulin, fasting glucose, cortisol, estradiol, FSH, LH, AMH, iron, ferritin, B12, creatinine, eGFR, ALT, AST, CRP, B9, homocysteine). The DB grows over time as new markers are curated and medically reviewed. **Adding a new marker is a data change, not a code change.**

- **The parser does not require the DB to match.** If a report contains a marker the DB doesn't know about, the parser still extracts it — it just can't classify it against our internal reference ranges. See "Unknown / unclassified markers" below.

- Age/sex sensitivity is first-class: a 25-year-old female's optimal estradiol differs dramatically from a 60-year-old female's. Every classification query takes age + sex + marker and returns the matching row (or none).

### Unknown / unclassified markers

A real blood report will often contain markers we haven't curated yet. The feature degrades gracefully:

1. **Extract** — the parser pulls the marker name, value, unit, and the lab's own reference range printed on the PDF (e.g., `90 – 200 mg/dL`).
2. **Classify attempt** — match against `biomarker_reference_ranges` by canonical id or alias.
3. **On miss** — render the marker with:
   - A **fourth status variant: `unclassified`** (grey rail, grey badge labeled `Not classified`, no range-bar zones since we don't know the optimal range).
   - The raw value + unit (unchanged).
   - The lab's own reference range from the PDF, rendered as plain text (`Lab range: 90 – 200 mg/dL`) instead of the gradient range bar.
   - **No sparkline trend** unless we have at least 2 reports with the same marker — trend is a function of history, not classification.
   - A "Learn more" link that says "We don't have a plain-English explainer for this marker yet" with a way to flag it for curation.
4. **Flag for curation** — every unclassified marker extraction creates a row in `biomarker_curation_queue` (new table) so the clinical advisor can prioritise additions to the reference DB.

The four status variants the UI must support:

| Variant            | Meaning                                            | Rail colour | Badge          |
| ------------------ | -------------------------------------------------- | ----------- | -------------- |
| `optimal`          | Classified + value in optimal range                | green       | Optimal        |
| `sub-optimal`      | Classified + value in sub-optimal range            | lavender    | Sub-optimal    |
| `action-required`  | Classified + value outside reference range         | red         | Action         |
| **`unclassified`** | Not in reference DB; raw value + lab's range shown | grey        | Not classified |

**Phase 2 shell note:** Plan 2D's `StatusBadge` component only implements the first three variants because the fixture has no unclassified markers. Phase 2.5 adds the fourth variant to the component library. This is logged in `docs/DEFERRED.md`.

### Trend logic

- Second and subsequent reports compare each marker to the immediately prior report for the same user.
- Trend = `(current − previous) / previous` expressed as a % delta.
- Direction arrow: ↑ if positive, ↓ if negative, → if within ±3%.
- A trend is only shown if the same marker exists in both reports.

## Phase mapping

| Deliverable                                                                                             | Phase                         | Notes                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Biomarker Report UI component (range bars, status badges, trend, narrative card)                 | **Phase 2**                   | Built against 8-marker fixture. **The component already renders a variable-length `markers[]` array — 3, 8, 40 markers all render correctly.**                 |
| `profile/lab-results/[id].tsx` renders the visual report (not raw PDF)                                  | **Phase 2**                   | Connected to fixture                                                                                                                                           |
| Upload flow (`lab-booking/upload-results.tsx`) with 3-second simulated `analyzing` state                | **Phase 2**                   | No real parsing — flips to the fixture report                                                                                                                  |
| `biomarker_reference_ranges` Convex table + schema (with `aliases` field + `source` citation)           | **Phase 2.5**                 | Must precede real parsing. **Schema is extensible — adding a new marker is an insert, not a code change.**                                                     |
| Seed data for ~25 common markers (MVP starting inventory, **not a ceiling**)                            | **Phase 2.5**                 | Medical review, source citations, seeder script. Grows over time as new markers are curated.                                                                   |
| `biomarker_curation_queue` table (captures unclassified markers flagged by the parser)                  | **Phase 2.5**                 | Every parse run that hits an unknown marker writes a row here, driving the curator's backlog.                                                                  |
| **Adaptive `parseLabReport` Convex action** (OCR + Claude extraction + per-marker classify + narrative) | **Phase 2.5**                 | **Marker-agnostic.** Extracts every marker in the report, attempts classification against the DB, renders unknowns as `unclassified` instead of dropping them. |
| **Fourth `StatusBadge` variant: `unclassified`** (grey rail, raw value + lab's own printed range)       | **Phase 2.5**                 | Required because real reports always contain markers the DB doesn't know yet. Plan 2D ships only 3 variants; this is the addition.                             |
| `MarkerCard` unclassified render state (no gradient range bar; shows lab's printed range as text)       | **Phase 2.5**                 | Graceful degradation when the DB has no matching row                                                                                                           |
| Real upload → parse → visual report wiring                                                              | **Phase 2.5**                 | Replaces the Phase 2 simulated state. **Works on any report, any marker set.**                                                                                 |
| Narrative generation that adapts to whatever markers are present                                        | **Phase 2.5**                 | Claude-generated "In summary" must reference only the markers in _this_ report — no template strings keyed to a fixed list                                     |
| Doctor-ordered labs populating biomarker reports automatically                                          | **Phase 2.5 or Phase 3 tail** | Depends on when the nurse flow lands                                                                                                                           |
| Integration with external lab APIs (Thyrocare, Metropolis, Lal PathLabs)                                | **Phase 8+**                  | Listed as "no lab APIs for MVP" in `CLAUDE.md`                                                                                                                 |

## Open questions (to resolve before the "new phase" begins)

1. **What do we call the new phase?** Options: "Phase 2.5 — Biomarker tracking foundation" (slot into the build order before Hair Loss), or fold into Phase 3 (risk: Hair Loss phase becomes large).
2. **OCR service choice.** Tesseract (self-host, free, lower accuracy) vs Google Cloud Vision / AWS Textract (paid, higher accuracy, PII concerns). Medical PDFs are usually native text, so OCR may be a fallback for image uploads only.
3. **Claude extraction prompt design.** Needs to be deterministic. Candidate: structured-output mode with a JSON schema, few-shot examples across the 25 seeded markers.
4. **What does the "Learn More" screen look like?** Plain-English Markdown (fast to build, curator tone) vs AI-generated per-user explanation (expensive, risks).
5. **Reference-range curation.** Who signs off on the ranges medically? We need a clinical advisor to approve the seed data before going to real patients.
6. **Multi-report comparison UI.** Trend arrows compare to the previous report — but do we also show a long-term line chart across all reports? Decision deferred to the new phase's brainstorm.
7. **Error state recovery.** If parsing fails, can the patient retry? Flag the marker as "couldn't read this one" or invalidate the whole report?
8. **Privacy.** Lab reports are the most sensitive data in the app. Does Convex file storage meet our compliance bar, or do we need a dedicated secure-blob path with separate audit logs?

## Tracking

- `docs/DEFERRED.md` — real parsing/OCR/reference-range seeding + real upload wiring deferred
- `docs/decisions/2026-04-14-phase-2-additions.md` — decision record for this feature's introduction
