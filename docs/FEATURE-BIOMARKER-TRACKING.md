# FEATURE — Visual Biomarker Tracking

**Status:** Core product feature. Not polish, not optional.
**First specified:** 2026-04-14 (Phase 2 brainstorm)
**Visual reference:** `docs/biomarker-reference.png`
**Patient-app integration:** [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]] Addition 2

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

- New Convex table: `biomarker_reference_ranges`
  - `marker` (e.g., "vitamin_d", "total_testosterone")
  - `unit`
  - `ageMin`, `ageMax`
  - `sex` (`male` | `female` | `any`)
  - `optimalMin`, `optimalMax`
  - `subOptimalMin`, `subOptimalMax`
  - `actionBelow`, `actionAbove`
  - `category` (e.g., "Hormonal Balance")
  - `explainer` (Markdown, shown on "Learn more" tap)
- Seeded at launch from a curated dataset (we compile this from medical reference tables). Initial scope: the ~25 most common markers across the 5 verticals (vitamin D, testosterone, TSH, HbA1c, lipid panel, CBC, DHEA-S, prolactin, insulin, fasting glucose, cortisol, estradiol, FSH, LH, AMH, iron, ferritin, B12, creatinine, eGFR, ALT, AST, CRP, vitamin B9, homocysteine).
- Every range row has a citation field — we track the source.
- Age/sex sensitivity is first-class: a 25-year-old female's optimal estradiol differs dramatically from a 60-year-old female's.

### Trend logic

- Second and subsequent reports compare each marker to the immediately prior report for the same user.
- Trend = `(current − previous) / previous` expressed as a % delta.
- Direction arrow: ↑ if positive, ↓ if negative, → if within ±3%.
- A trend is only shown if the same marker exists in both reports.

## Phase mapping

| Deliverable                                                                              | Phase                         | Notes                                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Visual Biomarker Report UI component (range bars, status badges, trend, narrative card)  | **Phase 2**                   | Built against fixture biomarker data. Reference fixture has ~8 markers across all 3 states              |
| `profile/lab-results/[id].tsx` renders the visual report (not raw PDF)                   | **Phase 2**                   | Connected to fixture                                                                                    |
| Upload flow (`lab-booking/upload-results.tsx`) with 3-second simulated `analyzing` state | **Phase 2**                   | No real parsing — flips to the fixture report                                                           |
| `biomarker_reference_ranges` Convex table + schema                                       | **New phase**                 | Must precede real parsing. Could fold into Phase 3 if Hair Loss needs real labs; else a dedicated phase |
| Curated reference-range seed data (25 markers)                                           | **New phase**                 | Medical review, source citations, seeder script                                                         |
| `parseLabReport` Convex action (OCR + Claude extraction + classification + narrative)    | **New phase**                 | The core AI feature                                                                                     |
| Real upload → parse → visual report wiring                                               | **New phase**                 | Replaces the Phase 2 simulated state                                                                    |
| Doctor-ordered labs populating biomarker reports automatically                           | **Phase 3 tail or new phase** | Depends on when nurse flow lands                                                                        |
| Integration with external lab APIs (Thyrocare, Metropolis, Lal PathLabs)                 | **Phase 8+**                  | Listed as "no lab APIs for MVP" in `CLAUDE.md`                                                          |

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
