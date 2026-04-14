# Deferred Items — Running Ledger

Every feature, screen, or decision intentionally deferred during a phase lives here. Update during each phase's brainstorm AND execution — this is the single source of truth for "what did we intentionally not build yet."

Rules:

1. **Every deferral gets an entry here the moment we decide it.** Not in a checkpoint, not in chat — here.
2. **Every entry names a destination phase.** "Later" is not a valid destination.
3. **When a phase ships the deferred work, strike it through and append the commit or phase that closed it.**
4. **Phase brainstorms must review this file** before starting — catches forgotten commitments.

---

## Phase 1 — Monorepo scaffold + Convex + design system ✅ (shipped 2026-04-13)

### Visual polish deferred

Captured retroactively from `checkpoint.md` — these two slipped through the cracks and proved the point that a ledger is needed.

| Item                                                                 | Deferred to             | Why                                                                                                                           |
| -------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Card styling (currently minimal — borders only)                      | Phase 3 (Hair Loss)     | Real card visual language emerges when real Hair Loss condition cards are built; Phase 1 shipped deliberately-bare primitives |
| Input polish: floating labels, +91 country prefix, validation states | Phase 2 (patient shell) | Primary consumer is patient auth + profile-setup forms — build the pattern when the real forms need it                        |

### Scaffolding gaps (retroactively captured from `docs/superpowers/specs/2026-04-13-phase-1-scaffold-design.md` and the Phase 1 plan)

| Item                                                                                                             | Deferred to                                          | Why                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| App icons + splash PNGs (mobile `icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`)                    | Phase 8 (launch polish)                              | Phase 1 used Expo defaults as placeholders; real brand assets land with launch polish                               |
| Landing page real content (copy, hero, features, FAQ)                                                            | Phase 8 (landing + notifications + polish)           | Phase 1 shipped a `/design` showcase only; real marketing content is explicitly Phase 8 per `CLAUDE.md` build order |
| Doctor portal real home + features                                                                               | Phase 4 (doctor portal)                              | Phase 1 shipped a scaffold placeholder home + `/design`; real portal is its own phase                               |
| Admin portal real home + features                                                                                | Phase 5 (admin portal)                               | Same — scaffold placeholder only                                                                                    |
| Nurse / Lab / Pharmacy app scaffolds                                                                             | Phase 6                                              | Explicitly skipped in Phase 1 spec "to avoid dead scaffolding" until those phases need them                         |
| Business-logic Convex tables (consultations, prescriptions, orders, payments, lab orders, medications, messages) | Phase 3+ (built per feature)                         | Phase 1 schema has `users` + `featureFlags` only; each business table lands with the feature that first needs it    |
| Web `Dialog` primitive — richer a11y (Radix or similar)                                                          | Phase 2+ (when a real dialog needs richer semantics) | Phase 1 used native `<dialog>` to avoid pulling Radix before needed; migrate when a real Phase 2+ dialog demands it |

---

## Phase 2 — Patient app shell (🔨 in progress, brainstorm stage)

### Route stubs — navigable but render "Coming in Phase X"

Every one of these screens exists as a real Expo Router route so `router.push()` from Phase 3+ never hits a dead target. They render a `<PlaceholderScreen phase="X" />` component.

| Screen                                                          | Deferred to                      | Why                                                    |
| --------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| `notifications/index` (push inbox)                              | Phase 8 (notifications + polish) | Push infrastructure not built; nothing real to list    |
| `profile/wallet` (balance + transactions)                       | Phase 3 (Hair Loss tail)         | No real transactions until first payment flows through |
| `profile/period-tracker`                                        | PCOS vertical phase              | PCOS isn't Phase 3's target vertical                   |
| `profile/legal` (terms, privacy, refund policy)                 | Phase 8 (launch polish)          | Static copy written at launch time                     |
| `profile/help` (in-app support chat)                            | Phase 8+                         | Support chat system doesn't exist yet                  |
| Subscription deep-management (pause, cancel, change plan flows) | Phase 3 tail                     | Needs a real subscription to manage                    |

### Features stubbed in Phase 2, wired real later

| Feature                                                                  | Deferred to                      | Why                                                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Razorpay real integration (webhook + verification)                       | Phase 3 (Hair Loss)              | Phase 2 mocks the checkout sheet; real wiring happens when the first real payment flows                                                                   |
| Per-vertical questionnaire _content_ (real questions, scales, branching) | Phase 3 + later vertical phases  | Phase 2 builds the engine only; real question sets ship with each vertical                                                                                |
| Hair Loss questionnaire content                                          | Phase 3 (Hair Loss)              | Stub questions in Phase 2                                                                                                                                 |
| ED questionnaire content                                                 | Phase 4 (ED vertical) — TBD      | Stub questions in Phase 2                                                                                                                                 |
| PE / Weight / PCOS condition detail pages + questionnaires               | Their respective vertical phases | Phase 2 shows them as "Coming Soon" teaser cards in Explore                                                                                               |
| Real Gupshup sender (WhatsApp/SMS) behind the custom OTP provider        | Phase 3 (Hair Loss)              | Provider interface is built in Phase 2 with a console-log stub sender; Gupshup swap is a one-file change when Business onboarding clears                  |
| Deep-link trigger handlers from push notifications                       | Phase 8 (notifications + polish) | `onlyou://` scheme registered in Phase 2 so routes resolve; actual notification-tap → route wiring needs real push infra                                  |
| iOS screenshot prevention on prescription/lab-results screens            | Phase 8 (launch polish)          | Android `FLAG_SECURE` done in Phase 2; iOS workaround (blank-screen in app switcher) is fiddly and belongs with launch polish                             |
| Social auth (Google + Apple Sign-In)                                     | Phase 3 (Hair Loss)              | `APP-PATIENT.md` §3 lists social auth on the welcome screen; Phase 2 ships phone-OTP only. Add Google + Apple when the first real subscription flow lands |
| Biometric lock (Face ID / Touch ID / fingerprint) after 5-min inactivity | Phase 8 (launch polish)          | `APP-PATIENT.md` §6.4 requirement; `expo-local-authentication`. Not needed at the approval gate                                                           |
| Auto-logout after 30 days of inactivity                                  | Phase 8 (launch polish)          | `APP-PATIENT.md` §6.5 security requirement; pair with biometric lock                                                                                      |
| App version check + force-update blocking modal                          | Phase 8 (launch polish)          | `APP-PATIENT.md` §1 cold-open requirement; no store releases yet, so nothing to force-update against                                                      |
| First-run onboarding tour / tutorial overlays                            | Phase 8 (launch polish)          | Not a shell concern — nice-to-have when real patients start hitting the app                                                                               |
| Haptic feedback + fine animation polish                                  | Phase 8 (launch polish)          | Expo Haptics is trivial to add later; shell uses default transitions                                                                                      |
| Accessibility audit (VoiceOver/TalkBack labels, dynamic type, contrast)  | Phase 8 (launch polish)          | Shell aims for sensible defaults; full a11y audit is launch-blocker work, not shell work                                                                  |
| Offline handling + network-error states (cached reads, retry UI)         | Phase 8 (launch polish)          | Convex handles retries; custom offline UX belongs with launch polish                                                                                      |
| Analytics / telemetry wiring (PostHog or similar)                        | Phase 8 (launch polish)          | Nothing to measure until real users exist                                                                                                                 |
| Error reporting (Sentry or similar)                                      | Phase 8 (launch polish)          | Same reasoning                                                                                                                                            |
| Multi-vertical active-patient demo (e.g., Hair Loss + ED both active)    | Phase 4+ (ED vertical)           | Scenario switcher has 4 single-vertical states in Phase 2; multi-vertical state becomes testable when a second vertical ships real                        |
| Hindi / multi-language (i18n)                                            | Post-MVP                         | Not in current product docs; English-only for MVP launch                                                                                                  |

### Convex wiring deferred

| Item                                     | Deferred to | Why                                                                                        |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Explore grid reading real feature flags  | Phase 3     | Phase 2 uses a fixture constant; scope-rule is "auth is real, everything else is fixtures" |
| Real user subscription state from Convex | Phase 3     | Shell uses the dev scenario switcher instead                                               |
| Real Convex queries anywhere except auth | Phase 3+    | Fixture hook `usePatientState()` reads from a TS file                                      |

### Deferred for founder re-visit at Phase 2 approval gate

Things the founder should explicitly weigh in on before Phase 3 starts:

- _(none yet — populated as brainstorm continues)_

### Brainstorm decisions (resolved)

- **Shell scope** → Option B: shell + real auth, fixtures for everything else
- **Fixture strategy** → Dev scenario switcher with 4 states (new · reviewing · ready · active), hidden behind `__DEV__`
- **Screen pruning** → Build ~40 real, defer ~10 as navigable route stubs (see tables above)
- **Vertical coverage** → Hair Loss + ED get real condition detail + questionnaire stubs; PE/Weight/PCOS are "Coming Soon" teaser cards
- **Testing** → Jest + React Native Testing Library nav smoke tests, ~1 test per screen. **TDD required** (red → green → refactor → visual check) per the rigid `test-driven-development` skill
- **Auth** → Custom Convex Auth OTP provider with pluggable sender. Phase 2 sender = console-log stub. Phase 3 swaps in real Gupshup. Includes:
  - 4 seeded fake users (`+91 99999 0000[1-4]`) matching the scenario-switcher states
  - Dev-only "Quick Login" drawer on the welcome screen (**DEV** only)
  - Hardcoded dev OTP `000000` for `+91 99999 000XX` numbers (**DEV** only)
  - All dev paths dead-code-eliminated in release builds

### Minor decisions (deciding without founder ping)

- **Deep-link handling (`onlyou://` scheme)** → Scheme registered in Expo config, routes wired for `messages/[id]`, `activity/[id]`, `lab-results/[id]`. Actual deep-link _triggering_ (notification tap → app open → route) comes with Phase 8 push infra. Tracked in DEFERRED as "deep link trigger handlers from push notifications → Phase 8".
- **Android + iOS parity** → Both platforms in Phase 2 since Expo gives us most of it for free. Apple Sign-In iOS-only (Android shows Google + email only, standard). FLAG_SECURE only on Android for prescription screens; iOS screenshot prevention is a Phase 8 polish item.

### Mid-brainstorm additions (2026-04-14)

Three cross-cutting additions were made to Phase 2 after the six core questions were answered. See [[decisions/2026-04-14-phase-2-additions|the decision note]] and [[APP-PATIENT-ADDITIONS|APP-PATIENT-ADDITIONS.md]].

| Addition                                 | Phase 2 scope                                                                                                     | Deferred                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gender-aware UI visibility               | Full rule, `useGender()` hook + `<GenderGate>`, fixture covers both sexes                                         | Nothing — in scope for Phase 2                                                                                                                                                                                          |
| Visual biomarker tracking (UI component) | Built against fixture data (`~8 markers × 3 states`), rendered in `profile/lab-results/[id].tsx` and after upload | Real OCR / PDF parsing, Claude-extraction action, `biomarker_reference_ranges` seed data, clinical review, real upload → parse wiring — all → **new biomarker-foundation phase (unnumbered, pre-Phase 3 or folded in)** |
| Conversion-optimized flows (CRO skills)  | Skills invoked at each target screen's implementation task                                                        | Nothing — in scope for Phase 2 (skill invocation is a planning convention, not deferred work)                                                                                                                           |

### Biomarker feature — detailed deferrals

| Item                                                                                  | Deferred to                                | Why                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `biomarker_reference_ranges` Convex table + schema + age/sex-aware lookup             | Biomarker foundation phase                 | Prerequisite for real classification — must precede real parsing         |
| Curated seed data for ~25 common markers (with citations)                             | Biomarker foundation phase                 | Requires medical-review partner and curation effort                      |
| Clinical advisor sign-off on reference ranges                                         | Biomarker foundation phase                 | Cannot ship to real patients without medical review                      |
| OCR service choice (Tesseract vs Google Vision vs AWS Textract) + integration         | Biomarker foundation phase                 | Decision + implementation                                                |
| `parseLabReport` Convex action (OCR → Claude extraction → classification → narrative) | Biomarker foundation phase                 | Core AI feature                                                          |
| Real upload → parse → visual report wiring (replaces the Phase 2 simulated state)     | Biomarker foundation phase                 |                                                                          |
| Doctor-ordered labs auto-populating biomarker reports                                 | Phase 3 tail or biomarker foundation phase | Depends on whether nurse flow lands first                                |
| "Learn more" per-marker explainer screen content                                      | Biomarker foundation phase                 | Plain-English Markdown, needs writer                                     |
| Multi-report long-term trend line chart                                               | Post-foundation (follow-up)                | Foundation phase ships per-marker trend arrow; full chart is a follow-up |
| External lab-API integrations (Thyrocare, Metropolis, Lal PathLabs)                   | Phase 8+                                   | `CLAUDE.md` explicitly says "no lab APIs for MVP"                        |
| Retry / partial-failure recovery UX for failed parses                                 | Biomarker foundation phase                 | Error state UX                                                           |

### Open decisions (for the next brainstorm cycle)

- **Where does the biomarker foundation phase live in the build order?** New phase 2.5? Folded into Phase 3? Post-Phase-3? Needs a decision before Phase 3 plan is written.

---

## Biomarker foundation phase — TBD

_(populated when this phase's brainstorm begins; sequencing to be decided)_

---

## Phase 3 — Hair Loss end-to-end

_(populated when Phase 3 brainstorm begins)_

---

## Phase 4+ — later phases

_(populated when each phase's brainstorm begins)_
