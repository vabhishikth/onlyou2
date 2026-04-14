# Phase 2 — Three Mid-Brainstorm Additions

**Date:** 2026-04-14
**Status:** Decided (Phase 2 brainstorm)
**Scope:** Three cross-cutting additions introduced after the six core brainstorm questions were resolved. All three affect Phase 2 shell work and project docs.

## Decisions

### 1. Gender-aware UI visibility

The patient app uses `user.gender` (from `profile-setup`) to filter verticals, profile items, and home-screen CTAs. Male patients never see PCOS or the period tracker; female patients never see ED or PE. "Other" / "prefer not to say" defaults to neutral verticals with an opt-in link to the gendered ones.

**Scope in Phase 2:** The visibility rules are implemented in the shell via a `useGender()` hook + `<GenderGate>` wrapper. Fixture scenario switcher must expose both male and female states so the founder can verify the gating at the approval gate.

**Full spec:** [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]] Addition 1.

### 2. Visual biomarker tracking (core feature)

When lab results land — doctor-ordered or patient-uploaded — the app shows a Visual Biomarker Report with status badges (OPTIMAL / SUB-OPTIMAL / ACTION REQUIRED / UNCLASSIFIED), range bars, trend comparison, and a plain-English narrative. The reference visual direction is `docs/biomarker-reference.png` (Clinical Curator tone, premium serif framing).

**Core principle: adaptive, not fixed.** The system renders whatever markers the uploaded report contains, not a pre-chosen list. Different reports have different panels (basic metabolic, thyroid-only, PCOS hormone, comprehensive wellness) with completely different marker sets. The parser is marker-agnostic — it extracts every marker in the report, classifies known ones against our reference DB, and gracefully degrades on unknown ones (fourth `unclassified` status variant: raw value + lab's own printed reference range + flag for curation). **Two different reports for the same patient can produce completely different Visual Biomarker Reports.**

**Scope in Phase 2:** The visual-report UI component and the `profile/lab-results/[id].tsx` screen are built against an 8-marker fixture that only exercises the first three status variants. Crucially, the component already renders a variable-length `markers[]` array — 3, 8, or 40 markers all render correctly. Real adaptive OCR, extraction, classification, the fourth `unclassified` variant, the `biomarker_curation_queue`, and reference-range seeding are all deferred to Phase 2.5 (Biomarker foundation).

**Full spec:** [[FEATURE-BIOMARKER-TRACKING|FEATURE-BIOMARKER-TRACKING.md]] — see §"Core principle — adaptive, not fixed" at the top of that file.

### 3. Conversion-optimized flows require CRO skills at implementation

Specific screens (auth, onboarding, plan selection, payment) are load-bearing for conversion. Their implementation tasks **must** invoke the corresponding Superpowers CRO skill at the start of the task so the screen inherits current best practices.

| Screen                                   | Required skill                                    |
| ---------------------------------------- | ------------------------------------------------- |
| Welcome, phone-verify, OTP-entry         | `signup-flow-cro`                                 |
| Profile setup                            | `onboarding-cro` + `app-onboarding-questionnaire` |
| Questionnaire engine                     | `app-onboarding-questionnaire`                    |
| Plan selection                           | `paywall-upgrade-cro` + `pricing-strategy`        |
| Payment                                  | `paywall-upgrade-cro`                             |
| Home empty state (first-time activation) | `onboarding-cro`                                  |

**Full spec:** [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]] Addition 3.

## Why these three, why now

1. **Gender-aware visibility** — the 5-vertical grid in the Phase 2 Explore tab cannot be built without a visibility rule. Shipping the shell with all 5 cards visible to everyone would require rework at Phase 3 and force an immediate revisit at the approval gate.
2. **Biomarker tracking** — the shell needs to render the screen _shape_ so the founder sees the UX at the gate. If we deferred the UI to a later phase, the Phase 2 lab-results screens would be misleading placeholders and the founder would approve the wrong UX.
3. **CRO flows** — the screens that will be built in Phase 2 (auth, profile setup, plan selection, payment) are precisely the screens where CRO mistakes are hardest to undo later. Naming the skills now binds the implementation tasks to them.

## Consequences

### Fixture scenario switcher (revised from [[2026-04-14-phase-2-fixture-and-auth-pattern|the earlier decision]])

The four seeded fake users now carry explicit genders and cover both the journey-state dimension and the gender dimension:

- `+91 99999 00001` → **Arjun** (male, state: `new`, intended Hair Loss)
- `+91 99999 00002` → **Priya** (female, state: `reviewing`, intended PCOS)
- `+91 99999 00003` → **Rahul** (male, state: `ready`, Hair Loss plan ready)
- `+91 99999 00004` → **Sanjana** (female, state: `active`, PCOS active with period tracker)

Flipping the switcher demos both the journey state and the gender gating at the same time.

### Deferred items (logged in `docs/DEFERRED.md`)

- Real OCR / PDF parsing
- Real Claude-API biomarker extraction action
- `biomarker_reference_ranges` Convex table + seeded data
- Clinical review of reference ranges
- Real upload → parse → report wiring
- External lab-API integrations (Thyrocare, Metropolis, Lal PathLabs — Phase 8+)
- Biomarker long-term trend line chart

### Screen tree additions (Phase 2 shell)

New routes + components added to the Phase 2 build list:

- `apps/mobile/src/components/biomarker/` — visual report components (marker card, range bar, status badge, trend arrow, narrative header)
- `apps/mobile/src/fixtures/biomarker-fixture.ts` — ~8 markers across all 3 states
- `profile/lab-results/[id].tsx` — now renders `<VisualBiomarkerReport />` instead of a PDF viewer stub
- `lab-booking/upload-results.tsx` — adds the "analyzing" simulated state

## Related

- [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]] — full patient-app addendum
- [[FEATURE-BIOMARKER-TRACKING|FEATURE-BIOMARKER-TRACKING.md]] — standalone feature spec
- [[DEFERRED|Deferred items ledger]] — biomarker real parsing + related items
- [[2026-04-14-phase-2-navigation-ia|Phase 2 navigation IA]]
- [[2026-04-14-phase-2-fixture-and-auth-pattern|Fixture + auth sender pattern]] (superseded re: gender distribution)
