# APP-PATIENT — Additions

**Date added:** 2026-04-14
**Status:** Authoritative — additions decided during Phase 2 brainstorm.

Companion document to `APP-PATIENT.md` and `APP-PATIENT-UPDATED-SECTIONS.md`. **Does not overwrite existing content.** Adds three new cross-cutting requirements that affect the patient app from Phase 2 onward.

Precedence rule: when conflicts arise, this file > `APP-PATIENT-UPDATED-SECTIONS.md` > `APP-PATIENT-CHANGES.md` > `APP-PATIENT.md`.

---

## Addition 1 — Gender-aware UI visibility

The patient app uses `user.gender` (captured during `profile-setup`) to control which features, verticals, and profile items appear. Male patients never see female-only features; female patients never see male-only features.

### Visibility rules

| Vertical / Feature         | Male shows | Female shows | Other / Prefer-not-to-say |
| -------------------------- | ---------- | ------------ | ------------------------- |
| Hair Loss                  | ✅         | ✅           | ✅                        |
| ED (erectile dysfunction)  | ✅         | ❌           | ✅ (opt-in)               |
| PE (premature ejaculation) | ✅         | ❌           | ✅ (opt-in)               |
| Weight Management          | ✅         | ✅           | ✅                        |
| PCOS                       | ❌         | ✅           | ✅ (opt-in)               |
| Profile → Period Tracker   | ❌         | ✅           | ❌ (until PCOS started)   |

**Default rule for "other" / "prefer not to say":** show the neutral verticals (Hair Loss, Weight) by default and let the user opt into the gendered ones from a single "See all conditions" link at the bottom of the Explore grid. Avoids assuming, doesn't hide care.

### Where the rule applies

1. **Explore grid** (`(tabs)/explore/index.tsx`) — filters condition cards by gender.
2. **Home tab greeting-state cards** — "Start your first assessment" CTA points to a vertical the user can actually receive care for.
3. **Profile menu** (`profile/index.tsx`) — period tracker row hidden for male users.
4. **Questionnaire entry** — gender gate at the top of gendered questionnaires rejects the mismatched gender with a friendly "This condition is not available for your profile" message.
5. **Deep links** — hitting `onlyou://explore/pcos` as a male user redirects to `/explore` with a toast.

### Implementation notes

- Single source of truth: `useGender()` hook reads from the authenticated user's profile.
- A small `<GenderGate allow={['female', 'other']}>` component wraps gendered routes and returns a fallback for mismatches.
- Fixture scenario switcher in the Phase 2 shell must cover **both male and female** states so founder can verify the gating visually.

---

## Addition 2 — Visual biomarker tracking (core feature)

When lab results arrive (ordered by a doctor) OR a patient uploads their own lab report (PDF or image), the app displays a **Visual Biomarker Report** — a narrative-framed, status-badged, range-bar visualization of every extracted biomarker with trend comparison across past reports.

**Full specification:** [[FEATURE-BIOMARKER-TRACKING|FEATURE-BIOMARKER-TRACKING.md]] — design, data flow, parsing strategy, phases, open questions.

**Visual reference:** `docs/biomarker-reference.png`.

### Affected patient-app routes

1. **`profile/lab-results/index.tsx`** — list view. Each row now has a "View visual report" CTA.
2. **`profile/lab-results/[id].tsx`** — detail view, now the Visual Biomarker Report (narrative paragraph + key markers + range bars + trend + PDF download) instead of a plain PDF viewer.
3. **`lab-booking/upload-results.tsx`** — after upload, the app shows a loading state ("Analyzing your report…") then transitions to the Visual Biomarker Report.
4. **`treatment/plan-ready.tsx`** — if the doctor's treatment plan was informed by a lab panel, a "View your biomarker report" card appears above the plan details.
5. **Activity tab** — lab orders progress to a "Ready to view" state that deep-links to the visual report, not the PDF.

### Phase 2 shell coverage

- The visual report UI is **built in Phase 2** against fixture biomarker data (one reference fixture with ~8 markers across the three states — optimal, sub-optimal, action required).
- Automatic parsing (OCR → extraction → classification) is deferred. In Phase 2 the upload flow simulates a 3-second "analyzing" state then loads the fixture report.
- See `FEATURE-BIOMARKER-TRACKING.md` for the full phase breakdown.

---

## Addition 3 — Conversion-optimized flows (CRO skills required at implementation)

Certain screens are load-bearing for conversion. When implementing them, the corresponding **Superpowers CRO skill is mandatory** — invoke it at the start of the screen's implementation task so the screen inherits the current best practices from that skill.

### Skill → screen mapping

| Screen                                                                  | Skill to invoke                                    | Why                                                                                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `(auth)/welcome.tsx`, `(auth)/phone-verify.tsx`, `(auth)/otp-entry.tsx` | `signup-flow-cro`                                  | First-touch conversion — minimize drop-off between landing and authenticated home                                               |
| `(auth)/profile-setup.tsx`                                              | `onboarding-cro` + `app-onboarding-questionnaire`  | First meaningful commitment — gender, DOB, address. Use questionnaire best practices for the form flow                          |
| Questionnaire engine screens                                            | `app-onboarding-questionnaire`                     | One-question-per-screen pattern, progress bar, back button, review screen — all canonical questionnaire-CRO territory           |
| `treatment/plan-selection.tsx`                                          | `paywall-upgrade-cro` + `pricing-strategy`         | First payment moment. Monthly vs Quarterly vs 6-month framing, anchoring, default plan selection, social proof, urgency framing |
| `treatment/payment.tsx`                                                 | `paywall-upgrade-cro`                              | Checkout friction, wallet auto-apply framing, trust cues                                                                        |
| Home tab empty state (new user)                                         | `onboarding-cro`                                   | Activation moment — "start your first assessment" is the key onboarding-to-activation metric                                    |
| Subscription management (cancel/pause flow — Phase 3 tail)              | `churn-prevention` (when that skill is introduced) | Save-offer and retention framing                                                                                                |

### How to use

1. At the start of the plan task for each screen in the table above, invoke the named skill.
2. The skill's output becomes part of the screen's design brief — typography of CTAs, copy angle, form flow, number of steps, friction-reduction defaults.
3. The screen's test assertions include the conversion-critical elements named by the skill.

---

## Tracking

These three additions are logged in `docs/DEFERRED.md` where applicable (biomarker real parsing is deferred) and in `docs/decisions/2026-04-14-phase-2-additions.md` (decision record).
