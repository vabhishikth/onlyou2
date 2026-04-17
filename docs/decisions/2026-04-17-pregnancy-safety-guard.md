---
date: "2026-04-17"
phase: 2.5
status: decision
tags:
  - clinical-safety
  - phase-2.5
  - biomarker
---

# Decision — Pregnancy safety guard on biomarker classification

**Date:** 2026-04-17
**Phase:** 2.5 brainstorm
**Spec reference:** [[superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design|Phase 2.5 design spec]] §3.5

## Decision

Before Phase 2.5 ships real parsing, the `users` table adds a nullable `pregnancyStatus: "pregnant" | "not_pregnant" | "unknown"`. For **female users** whose pregnancy status is `pregnant`, `unknown`, or `null`, the parser **will not classify** markers whose reference ranges shift meaningfully in pregnancy. Those markers render as `unclassified:pregnancy_sensitive` with the note "Reference ranges vary with pregnancy — your doctor will interpret these."

Only `pregnancyStatus: "not_pregnant"` permits classification on pregnancy-sensitive markers.

### Pregnancy-sensitive marker list (12 of 32 seed markers)

TSH, Free T3, Free T4, Ferritin, Iron (serum), Hemoglobin, HbA1c, Fasting Glucose, Estradiol, LH, FSH, Prolactin.

Every `biomarker_reference_ranges` row carries `pregnancySensitive: boolean` explicitly. The seeder script refuses to load rows where the field is missing.

### First-upload prompt

When a female user initiates an upload and `pregnancyStatus === null`, a bottom sheet fires: "Are you currently pregnant? This affects how we read your results." Three options: Yes / No / Prefer not to say. Cancel aborts upload. The selection writes `pregnancyStatus` before parse begins.

## Why

Reference ranges that are correct for a non-pregnant adult are clinically wrong for a pregnant adult on these 12 markers. Classifying a pregnant woman's TSH of 3.0 mIU/L as `action_required` against a non-pregnant range (when pregnancy-specific ranges would call it normal) is not a UX gap — it's a clinical harm vector. A red badge attached to a number the patient's doctor would call fine creates anxiety, undermines trust, and in the worst case drives behavior (skipping medication, rushing to ER) against medical advice.

The default posture here must be **refuse to classify** when we cannot be confident. Phase 2.5 does not ship pregnancy-specific range data (that's PCOS-phase work). The guard is the interim protection.

## Why this runs before `profile_incomplete`

If we checked "profile complete" first, a pregnant female user with a complete profile would fall through to classification on sensitive markers — exactly the harm scenario. The guard must fire before the profile check. See ordering in §3.5 of the spec.

## How to apply

- Every new reference-range row (seed or curation) sets `pregnancySensitive` explicitly. CI seed-validation test blocks missing values.
- Every classification path in the parser runs the guard step before threshold comparison.
- `pregnancy-guard.test.ts` exhaustively covers: 12 markers × {pregnant, unknown, null, not_pregnant} × {female, male}. `male` never triggers the guard, even on sensitive markers. Female + `not_pregnant` classifies normally.
- An explicit clinical-harm assertion lives in the test: a pregnant user's TSH value that would be `action_required` on non-pregnant ranges is never surfaced as such.
- When pregnancy-specific range data arrives in the PCOS phase, these markers stop falling into `unclassified:pregnancy_sensitive` and instead classify against pregnancy ranges. The guard field stays — it becomes "when we don't have the right range for this life stage, we refuse to classify."

## Future extensions

Same pattern will apply to post-menopausal ranges (marker behavior differs), hormonal-birth-control status (LH/FSH/Estradiol shifts), and pediatric ranges. All post-foundation. The `pregnancy-sensitive` flag is the first instance of a general pattern: "clinical context gate before classification."
