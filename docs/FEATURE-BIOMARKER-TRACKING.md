# FEATURE — Visual Biomarker Tracking

**Status:** Core product feature. Not polish, not optional.
**First specified:** 2026-04-14 (Phase 2 brainstorm)
**Visual reference:** `docs/biomarker-reference.png`
**Patient-app integration:** [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]] Addition 2

**Phase 2.5A shipped 2026-04-18** (see [[decisions/2026-04-18-phase-2.5a-as-built]]):

- ✅ `biomarker_reference_ranges` table + 45 DRAFT seed rows across 32 canonical markers
- ✅ `biomarker_curation_queue` table (schema only; caller wiring → 2.5C)
- ✅ `unit-conversions.json` with 15 factors
- ✅ `biomarkerPalette` + `biomarkerFonts` editorial register + ESLint two-register guards
- ✅ Seeder script + `ALLOW_UNREVIEWED_RANGES` dev guard + prod hard-fail
- ✅ `seed-validation.test.ts` CI guard (19 assertions)
- ⏳ Parse pipeline (`parseLabReport`, Claude Vision) → **Plan 2.5B**
- ⏳ Intake mutation, notifications, curation admin, portal contracts → **Plan 2.5C**
- ⏳ Mobile biomarker screens (Dashboard, Detail, Report, Upload) + fourth `unclassified` `StatusBadge` variant → **Plan 2.5D**
- ⏳ Clinical advisor sign-off on 45 DRAFT rows → prerequisite before prod merge

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

| Deliverable                                                                                                                                            | Phase                         | Notes                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Biomarker Report UI component (range bars, status badges, trend, narrative card)                                                                | **Phase 2**                   | Built against 8-marker fixture. **The component already renders a variable-length `markers[]` array — 3, 8, 40 markers all render correctly.**                 |
| `profile/lab-results/[id].tsx` renders the visual report (not raw PDF)                                                                                 | **Phase 2**                   | Connected to fixture                                                                                                                                           |
| Upload flow (`lab-booking/upload-results.tsx`) with 3-second simulated `analyzing` state                                                               | **Phase 2**                   | No real parsing — flips to the fixture report                                                                                                                  |
| ~~`biomarker_reference_ranges` Convex table + schema (with `aliases` field + `source` citation)~~ **✓ Shipped 2.5A — `78f9439`**                       | ~~**Phase 2.5**~~             | Live on dev Convex with `by_canonical_id` + `by_active` indexes. Extensible as promised.                                                                       |
| ~~Seed data for ~25 common markers (MVP starting inventory, **not a ceiling**)~~ **✓ Shipped 2.5A — tranches `481cce5` `bd79b41` `f8b7196` `e679b63`** | ~~**Phase 2.5**~~             | 45 DRAFT rows across 32 canonical markers. Clinical advisor sign-off outstanding.                                                                              |
| ~~`biomarker_curation_queue` table (captures unclassified markers flagged by the parser)~~ **✓ Table shipped 2.5A — `78f9439`** (caller logic → 2.5C)  | ~~**Phase 2.5**~~             | Schema + `by_normalized_key` + `by_status_prevalence` indexes live. 2.5C wires mutations that insert into it.                                                  |
| **Adaptive `parseLabReport` Convex action** (OCR + Claude extraction + per-marker classify + narrative)                                                | **Phase 2.5**                 | **Marker-agnostic.** Extracts every marker in the report, attempts classification against the DB, renders unknowns as `unclassified` instead of dropping them. |
| **Fourth `StatusBadge` variant: `unclassified`** (grey rail, raw value + lab's own printed range)                                                      | **Phase 2.5**                 | Required because real reports always contain markers the DB doesn't know yet. Plan 2D ships only 3 variants; this is the addition.                             |
| `MarkerCard` unclassified render state (no gradient range bar; shows lab's printed range as text)                                                      | **Phase 2.5**                 | Graceful degradation when the DB has no matching row                                                                                                           |
| Real upload → parse → visual report wiring                                                                                                             | **Phase 2.5**                 | Replaces the Phase 2 simulated state. **Works on any report, any marker set.**                                                                                 |
| Narrative generation that adapts to whatever markers are present                                                                                       | **Phase 2.5**                 | Claude-generated "In summary" must reference only the markers in _this_ report — no template strings keyed to a fixed list                                     |
| Doctor-ordered labs populating biomarker reports automatically                                                                                         | **Phase 2.5 or Phase 3 tail** | Depends on when the nurse flow lands                                                                                                                           |
| Integration with external lab APIs (Thyrocare, Metropolis, Lal PathLabs)                                                                               | **Phase 8+**                  | Listed as "no lab APIs for MVP" in `CLAUDE.md`                                                                                                                 |

## Open questions — resolved at Phase 2.5 brainstorm (2026-04-17)

Answers landed in [[superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design|Phase 2.5 design spec]]. Summary here for quick reference.

1. ~~**Phase name?**~~ → **Phase 2.5 — Biomarker foundation.** Standalone mini-phase between Phase 2 shell and Phase 3 Hair Loss. Own approval gate.
2. ~~**OCR service?**~~ → **Claude vision-native.** No separate OCR. See [[decisions/2026-04-17-claude-vision-native-parsing]].
3. ~~**Claude extraction prompt design?**~~ → Structured JSON output per strict schema + cached system prompt + cached few-shot examples for Thyrocare / Metropolis / SRL. Model IDs centralized in `convex/lib/claude.ts`. Retries stay on Sonnet with "fix the JSON" follow-up; no Opus escalation.
4. ~~**"Learn More" format?**~~ → Plain-English Markdown in the `explainer` field of each `biomarker_reference_ranges` row. Curator-authored. AI-generated per-user explanations deferred.
5. ~~**Who signs off on ranges?**~~ → Clinical advisor (not yet named) signs off on `biomarker-ranges.json` seed. Blocking prerequisite for prod deploy. Seeder script hard-fails on prod without `clinicalReviewer` populated. See [[DEFERRED]] Phase 2.5 prerequisites.
6. ~~**Long-term line chart?**~~ → **Deferred post-foundation.** Phase 2.5 ships per-marker trend arrow on cards + real-data-only area chart on marker deep-dive (1 point = baseline dot, 2 = line between real points, ≥2 = auto-fit axis). No synthetic history.
7. ~~**Parse-failure retry?**~~ → User-triggered via "Try again" CTA in the error state. `retryParseLabReport({ labReportId })` mutation re-schedules against same row; rate-limit counter NOT re-incremented. Error copy branches on PDF vs image mime. Auto-retry on `timeout` via cron.
8. ~~**Privacy?**~~ → Convex file storage with signed, ownership-scoped URLs for reads. Telemetry never logs PDF content or extracted values. iOS screenshot prevention deferred to Phase 8 (Android `FLAG_SECURE` covered in Phase 2). Compliance (DPDP Act) review deferred to launch polish.

## New decisions from Phase 2.5 brainstorm (2026-04-17)

- **32-marker seed** (union of 5 verticals + CBC + lipid-separated), not "~25". See [[decisions/2026-04-17-phase-2.5-scope-boundary]].
- **Pregnancy safety guard** — 12 pregnancy-sensitive markers render unclassified when female user's `pregnancyStatus` is `pregnant`, `unknown`, or `null`. See [[decisions/2026-04-17-pregnancy-safety-guard]].
- **Two-register design system** — editorial palette for biomarker surfaces, Clinical Luxe elsewhere. See [[decisions/2026-04-17-biomarker-design-register]].
- **`biomarker_values` as its own table** (not embedded). See [[decisions/2026-04-17-biomarker-values-split]].
- **Three ingestion surfaces, one pipeline** — patient upload (full UI), lab upload (backend contract only, Phase 6 UI), doctor-ordered (backend contract only, Phase 4 UI). `LAB_PORTAL_ENABLED` and `DOCTOR_PORTAL_ENABLED` env flags gate mutation registration.
- **Curation backfill** is a named deliverable, not an edge case — admin surface + reclassification job + `lab_report_updated` notification.
- **Rate limits**: 5/day + 50/month per user. Kill-switch feature flag `biomarker_parsing_enabled`.

## Planning structure (2026-04-18)

- **Ships as 4 sub-plans** — 2.5A Foundation → 2.5B Parse pipeline → 2.5C Ingestion + curation + portal contracts → 2.5D Mobile + approval gate. Each sub-plan produces working, testable software with its own first-pass review. Only 2.5D triggers the Phase 2.5 approval gate and merge to master. See [[decisions/2026-04-18-phase-2.5-plan-split]].

## Tracking

- `docs/DEFERRED.md` — full Phase 2.5 prerequisites + deferrals ledger
- `docs/superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design.md` — authoritative design spec
- `docs/decisions/2026-04-17-biomarker-design-register.md` — two-register typographic system
- `docs/decisions/2026-04-17-phase-2.5-scope-boundary.md` — 32-marker seed, ingestion surfaces, phase boundaries
- `docs/decisions/2026-04-17-pregnancy-safety-guard.md` — clinical safety guard
- `docs/decisions/2026-04-17-claude-vision-native-parsing.md` — parsing strategy
- `docs/decisions/2026-04-17-biomarker-values-split.md` — per-marker row table
- `docs/decisions/2026-04-18-phase-2.5-plan-split.md` — 4-sub-plan ship structure
- `docs/superpowers/plans/2026-04-18-phase-2.5a-foundation.md` — Plan 2.5A (tokens + schema + seed)
- `docs/decisions/2026-04-14-phase-2-additions.md` — original decision record for this feature's introduction
