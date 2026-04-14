# Phase 2 — Patient App Shell (Design Spec)

**Date:** 2026-04-14
**Status:** Design approved, ready for `writing-plans` transition.
**Brainstorm artifacts:** `.superpowers/brainstorm/1661-*/content/*.html`, `.superpowers/brainstorm/2538-*/content/*.html`
**Authoritative sources (Obsidian vault):**

- `docs/APP-PATIENT.md` + `-CHANGES.md` + `-UPDATED-SECTIONS.md` + **`docs/APP-PATIENT-ADDITIONS.md`** (precedence in that order, additions wins).
- `docs/FEATURE-BIOMARKER-TRACKING.md`
- `docs/DESIGN.md`
- `docs/decisions/2026-04-14-phase-2-navigation-ia.md`
- `docs/decisions/2026-04-14-phase-2-fixture-and-auth-pattern.md`
- `docs/decisions/2026-04-14-phase-2-additions.md`
- `docs/DEFERRED.md` (running ledger — reviewed before this spec was written)
- `CLAUDE.md` Rules 1–10

---

## 1. Goal

Ship a **fully navigable patient mobile app shell** on Expo — every screen the patient will ever see, rendered with Clinical Luxe styling and fixture data — so the founder can walk the entire app at the Phase 2 approval gate, in any patient state, on both iOS and Android, and approve it for Phase 2.5 (biomarker foundation) and Phase 3 (Hair Loss end-to-end) to build real features on top of.

## 2. The one hard rule

**Auth is real. Everything else is fixtures.** Easy to explain, easy to enforce, easy to hand off.

## 3. Scope — what Phase 2 builds

### 3.1 Build targets (~40 real screens)

Every screen below is **built real**: Expo Router file + component tree + DESIGN.md tokens via NativeWind + reads fixture data through `usePatientState()` or `useGender()` + has a corresponding TDD test file.

**Auth stack (`(auth)/`)**

- `welcome.tsx` — wordmark hero, primary CTA, dev-only Quick Login drawer
- `phone-verify.tsx` — `<PhoneInput>` (+91 locked, 10-digit Indian)
- `otp-entry.tsx` — 6-box OTP input, auto-advance, resend timer, dev bypass
- `profile-setup.tsx` — name, DOB (18+ gate), gender, pincode auto-fill, address

**Tab layout (`(tabs)/_layout.tsx`) — 4 bottom tabs + header**

- Header top-left: `onlyou` wordmark (Playfair Display Black), triple-tap opens dev scenario switcher.
- Header top-right: avatar button → pushes `profile/` stack.
- Tabs: Home · Explore · Activity · Messages.

**Home tab (`(tabs)/home/`)**

- `index.tsx` — daily command centre (empty / under review / plan ready / active states — reads `usePatientState()`)
- `tracking/[id].tsx` — lab or delivery stepper detail

**Explore tab (`(tabs)/explore/`)**

- `index.tsx` — 5-condition grid, **gender-filtered** via `<GenderGate>`
- `[condition].tsx` — condition detail (hero, how it works, pricing, FAQ) for Hair Loss + ED; PE/Weight/PCOS show as "Coming Soon" teaser cards

**Activity tab (`(tabs)/activity/`)**

- `index.tsx` — active + completed orders/labs
- `[orderId].tsx` — order/lab detail stepper

**Messages tab (`(tabs)/messages/`)**

- `index.tsx` — conversation list (one per vertical)
- `[conversationId].tsx` — chat screen (input disabled in shell)

**Profile stack (`profile/`)** — pushed from the avatar button

- `_layout.tsx` + `index.tsx` (menu, gender-filtered rows)
- `personal-info.tsx`, `subscriptions.tsx` (list only), `prescriptions.tsx`, `orders.tsx`, `lab-results.tsx`, `addresses.tsx`, `payment-methods.tsx` (list only), `notifications.tsx` (settings only)

**Questionnaire engine (`questionnaire/`)** — modal stack

- `[condition]/index.tsx` — entry, gender branch for Hair Loss
- `[condition]/[qid].tsx` — one question per screen, progress bar, back button
- `[condition]/review.tsx` — review answers, submit
- Stub question set for Hair Loss + ED (4 placeholder questions each)

**Photo upload (`photo-upload/`)**

- `[condition].tsx` — upload container with vertical-specific guidance
- `camera.tsx` — camera overlay with framing guides

**Treatment journey (`treatment/`)**

- `confirmation.tsx` — submitted, under review (free)
- `plan-ready.tsx` — dr name, diagnosis, meds, PDF preview
- `plan-selection.tsx` — Monthly / Quarterly / 6-month
- `payment.tsx` — Razorpay sheet (mocked — success on 2s timeout)
- `subscription-confirmed.tsx` — success, meds being prepared

**Lab booking (`lab-booking/`)**

- `index.tsx` — book collection OR upload own
- `slot-selection.tsx` — date/time picker
- `address-confirm.tsx`
- `upload-results.tsx` — file picker, 3-second simulated "analyzing" state, then transitions to the fixture biomarker report

**Biomarker components** — `apps/mobile/src/components/biomarker/`

- `VisualBiomarkerReport.tsx` — the full v2 design (hero card + narrative + markers + CTAs)
- `MarkerCard.tsx` — per-marker card (name, category, value, unit, trend, range bar, sparkline, status badge, learn more)
- `StatusBadge.tsx` — `optimal | sub-optimal | action` variants
- `RangeBar.tsx` — gradient track + dashed optimal zone + value dot
- `TrendArrow.tsx` + `Sparkline.tsx`
- `NarrativeHero.tsx` — gradient top-line, italic pull-quote, curator byline

### 3.2 Route stubs (~10) — navigable but render `<PlaceholderScreen phase="X" />`

Every route below exists as a real file so `router.push()` never hits a dead target. The `PlaceholderScreen` component is one shared file that takes a `phase` prop and renders a friendly "Coming in Phase X" card.

- `notifications/index.tsx` → Phase 8
- `profile/wallet.tsx` → Phase 3
- `profile/period-tracker.tsx` → PCOS vertical phase
- `profile/legal.tsx` → Phase 8
- `profile/help.tsx` → Phase 8+
- Subscription deep management (pause / cancel / change-plan flows reachable from `profile/subscriptions.tsx`) → Phase 3 tail

### 3.3 Out of scope

Full list with destination phases lives in `docs/DEFERRED.md`. Highlights:

- Real Gupshup sender (WhatsApp/SMS) → Phase 3
- Real Razorpay integration → Phase 3
- Real OCR / biomarker parsing → **Phase 2.5 (Biomarker foundation)**
- Per-vertical real questionnaire content → Phase 3 (Hair Loss) + later vertical phases
- Social auth (Google + Apple Sign-In) → Phase 3
- Biometric lock, auto-logout, force-update modal, iOS screenshot prevention → Phase 8
- Onboarding tour, haptics, a11y audit, offline handling, analytics, Sentry → Phase 8
- Deep-link trigger handlers from push notifications → Phase 8
- Hindi / multi-language → post-MVP

## 4. Architecture

### 4.1 Navigation (per `docs/decisions/2026-04-14-phase-2-navigation-ia.md`)

**4 bottom tabs + profile avatar in the header** (not the 5-tab layout in `APP-PATIENT.md` §1). Profile stack is accessed via `router.push('/profile')` from the avatar button. Large-title iOS headers on tab roots; standard on profile sub-screens.

### 4.2 File layout

```
apps/mobile/
├── app/                                # Expo Router tree
│   ├── _layout.tsx                     # Root providers: theme, fonts, Convex, auth gate, scenario switcher mount
│   ├── index.tsx                       # Splash → auth branching
│   ├── (auth)/                         # Unauth stack
│   ├── (tabs)/                         # Auth tabs + header
│   ├── profile/                        # Pushed stack from avatar
│   ├── questionnaire/                  # Modal stack
│   ├── photo-upload/                   # Modal stack
│   ├── treatment/                      # Modal stack
│   ├── lab-booking/                    # Modal stack
│   └── notifications/                  # Placeholder
│
├── src/
│   ├── components/
│   │   ├── ui/                         # PremiumButton, PremiumInput (refined from Phase 1 polish), Card, etc.
│   │   ├── biomarker/                  # VisualBiomarkerReport + sub-components
│   │   ├── placeholder-screen.tsx      # Shared "Coming in Phase X" component
│   │   └── gender-gate.tsx             # <GenderGate allow={['female','other']}>
│   │
│   ├── fixtures/
│   │   ├── patient-states.ts           # 4 FixtureUser objects (Arjun / Priya / Rahul / Sanjana)
│   │   └── biomarker-fixture.ts        # 8 markers × 3 states
│   │
│   ├── hooks/
│   │   ├── use-patient-state.ts        # returns the active FixtureUser slice
│   │   └── use-gender.ts               # returns authenticated user's gender
│   │
│   ├── stores/
│   │   └── dev-scenario-store.ts       # Zustand, __DEV__-gated, AsyncStorage-persisted
│   │
│   ├── dev/
│   │   └── scenario-switcher.tsx       # Bottom-sheet UI, __DEV__ only
│   │
│   └── test-utils/
│       ├── test-provider.tsx           # Wraps a screen in a given scenario for tests
│       └── mock-router.ts              # Expo Router test helper
│
├── __tests__/
│   └── screens/                        # ~40 screen test files
│
├── app.config.ts                       # `onlyou://` scheme registered
└── package.json
```

### 4.3 Convex additions

New / modified tables (minimal — "auth is real, everything else is fixtures"):

- `users` — extended: `gender`, `dob`, `pincode`, `city`, `state`, `address`, `phoneVerified`, `profileComplete`
- `otpAttempts` — new: `phone`, `hashedOtp`, `expiresAt`, `attempts`
- `featureFlags` — already exists from Phase 1

**New Convex files:**

- `convex/auth.ts` — custom phone-OTP provider registered via `convexAuth({ providers: [PhoneOtp] })`
- `convex/auth/sender.ts` — `OtpSender` interface + `ConsoleLogSender` implementation (Phase 2 default)
- `convex/auth/phone-otp-provider.ts` — custom Convex Auth provider handling OTP generation, bcrypt hashing, TTL, verification
- `convex/seed/fake-users.ts` — idempotent seeder for the 4 fake patients. Gated by `process.env.CONVEX_DEPLOYMENT_TYPE !== 'prod'` — runs against the `aromatic-labrador-938` dev deployment, skipped for any production deployment.

**No** business-logic tables (consultations, prescriptions, orders, messages, biomarker_reports, etc.) — deferred to the phases that actually need real ones.

### 4.4 Auth flow

Per `docs/decisions/2026-04-14-phase-2-fixture-and-auth-pattern.md`. Summary:

1. Splash reads Convex Auth session. Three branches: no session → `(auth)/welcome`; session + profile incomplete → `(auth)/profile-setup`; session + profile complete → `(tabs)/home`.
2. Welcome → phone → OTP → (first-time only) profile-setup → home.
3. **Dev Quick-Login drawer** on the welcome screen: 4 rows, each one auto-logs you in as one of the fake users. `__DEV__` only.
4. **Dev OTP bypass:** `000000` is accepted for any `+91 99999 000XX` number in `__DEV__` builds. Production builds reject it unconditionally — the `if (__DEV__)` block is dead-code-eliminated.
5. Sign out clears the Convex Auth session and returns to `(auth)/welcome`.

**Integration with the scenario switcher:** when the switcher flips to a new scenario, it signs out the current session and signs in as the new fake user, then navigates to `(tabs)/home`. Feels instant because the sender is `ConsoleLogSender` + the OTP is `000000`.

### 4.5 Fixture layer

Per §4.2 layout. `FIXTURES` object keyed by `PatientState` (`new | reviewing | ready | active`). Each `FixtureUser` carries:

- `userId` — real Convex `Id<'users'>` (seeded)
- `phone`, `name`, `gender`, `age`, `state`
- `consultations`, `prescriptions`, `orders`, `deliveries`, `messages`, `biomarkerReports`, `subscriptions`

The four users:

| Phone             | Name    | Gender | State       | Intent                                         |
| ----------------- | ------- | ------ | ----------- | ---------------------------------------------- |
| `+91 99999 00001` | Arjun   | male   | `new`       | Nothing started. Empty home.                   |
| `+91 99999 00002` | Priya   | female | `reviewing` | PCOS assessment submitted, awaiting doctor     |
| `+91 99999 00003` | Rahul   | male   | `ready`     | Hair Loss plan ready, hasn't paid yet          |
| `+91 99999 00004` | Sanjana | female | `active`    | PCOS active, Day 14, period tracker data, meds |

`usePatientState()` reads `dev-scenario-store`'s `activeScenario` and returns the matching `FixtureUser`. Destructure for whatever slice you need:

```ts
const { consultations, biomarkerReports } = usePatientState();
```

**In production (Phase 3+):** this hook is the one file that gets rewritten to pull from real Convex queries. Every screen's call site stays the same. This is the handoff seam that makes Phase 3's job small.

### 4.6 Dev scenario switcher

- Triple-tap the `onlyou` wordmark (using `react-native-gesture-handler` tap recognizer, `numberOfTaps: 3`).
- Opens a bottom sheet (Gorhom's `@gorhom/bottom-sheet`) with the 4 scenarios listed, current selection indicated, and a "Clear all data & relaunch" button.
- Tap a scenario → updates Zustand store → everything re-renders.
- Entirely wrapped in `if (__DEV__)`. Release bundler strips the component tree.

### 4.7 Gender-aware UI (per `docs/APP-PATIENT-ADDITIONS.md` §1)

- `useGender()` hook reads from the authenticated user record.
- `<GenderGate allow={['male','other']}>` wraps gendered routes. Mismatches render a `<NotAvailableForProfile />` component.
- Explore grid filters condition cards through the rule table in APP-PATIENT-ADDITIONS §1.
- Profile menu hides period tracker for male users.
- Deep-link safety: `onlyou://explore/pcos` as a male user redirects to `/explore` with a toast.

### 4.8 Visual Biomarker Report (per `docs/FEATURE-BIOMARKER-TRACKING.md` + brainstorm mockup `06-biomarker-report-v2.html`)

Components in `src/components/biomarker/` build the v2 visual reviewed during brainstorm. They read from `biomarker-fixture.ts` — a single fixture with ~8 markers spanning all three status states.

**Phase 2 renders this in two places:**

1. `profile/lab-results/[id].tsx` — list → detail flow, detail is the visual report.
2. `lab-booking/upload-results.tsx` — after "upload", the screen shows a 3-second simulated "Analyzing your report…" state with a shimmer, then transitions to the fixture report.

Real parsing/OCR/extraction/reference-range seeding → Phase 2.5.

### 4.9 Testing (TDD — rigid discipline per `superpowers:test-driven-development`)

Stack: Jest + `jest-expo` + `@testing-library/react-native` + `@testing-library/jest-native` + `expo-router/testing-library`.

**Per-screen cycle** (rigid — do not skip steps):

1. 🔴 Write a failing test with at least three assertions (renders, key element visible, primary nav action fires).
2. 🟢 Build the screen just enough to pass.
3. 🔄 Refactor (extract shared components used more than once).
4. 👁 Visual check on iOS simulator + Android emulator against the brainstorm mockups.

**Tests use `<TestProvider scenario="...">` to set the Zustand store before render. No Convex mocking needed — `usePatientState()` reads directly from the fixture file in test mode.**

Total tests ≈ 120 (≈3 per screen × ~40 screens). Run in ~30s in CI.

**Extra focused test files** beyond the per-screen ones:

- `gender-gate.test.tsx` — 4 tests (male/female/other × allowed/blocked)
- `visual-biomarker-report.test.tsx` — 3 tests (one per status state)
- `dev-scenario-switcher.test.tsx` — scenario switching updates store

**Pre-commit hook** (extends Phase 1's husky + lint-staged): `tsc --noEmit` + `eslint` + `jest --findRelatedTests <staged files>`. Full suite on push.

### 4.10 Conversion-optimized flows (per `docs/APP-PATIENT-ADDITIONS.md` §3)

Implementation tasks for the screens below **must** invoke the named skill at the start of the task. The skill output becomes part of the screen's plan task.

| Screen                                   | Required skill                                    |
| ---------------------------------------- | ------------------------------------------------- |
| Welcome, phone-verify, OTP-entry         | `signup-flow-cro`                                 |
| Profile setup                            | `onboarding-cro` + `app-onboarding-questionnaire` |
| Questionnaire engine                     | `app-onboarding-questionnaire`                    |
| Plan selection                           | `paywall-upgrade-cro` + `pricing-strategy`        |
| Payment                                  | `paywall-upgrade-cro`                             |
| Home empty state (first-time activation) | `onboarding-cro`                                  |

Test assertions for these screens include the conversion-critical elements named by the skill.

### 4.11 Code review (per `CLAUDE.md` Rule 10)

Before Phase 2 merges to master, the `superpowers:requesting-code-review` skill runs on the full diff. Every finding is addressed or explicitly acknowledged. Review report is committed at `docs/superpowers/reviews/2026-XX-XX-phase-2-patient-shell-review.md`.

### 4.12 Error handling + edge cases

- **Auth failures:** OTP send failure → toast + retry button. Wrong OTP 3 times → 10-minute lockout per phone, surfaced in UI.
- **Gender mismatch** via deep link → redirect to `/explore` with a non-blocking toast.
- **Placeholder screens** for deferred routes: friendly empty-state illustration, "Coming in Phase X" copy, back button.
- **Failed fixture load** (should be impossible — TypeScript static import): hard crash with a useful message in dev, fallback empty state in release.
- **Production-only paranoid check:** startup code throws if `ConsoleLogSender` is the active sender (belt-and-braces against accidental release of the stub).

## 5. Out of scope — full list

Authoritative list in `docs/DEFERRED.md` §Phase 2. This spec's scope section is final — anything not in §3 is deferred by default. New deferrals discovered during implementation must be added to DEFERRED.md immediately per Rule 9.

## 6. Acceptance criteria (the Phase 2 approval gate)

Every item below must be true before merge.

### 6.1 Build integrity

- [ ] Zero TypeScript errors (`pnpm typecheck`)
- [ ] Zero ESLint errors/warnings (`pnpm lint`)
- [ ] All ~120 tests pass (`pnpm test`)
- [ ] Pre-commit hook blocks commits failing any of the above

### 6.2 Build artifacts

- [ ] iOS simulator build runs (`pnpm --filter mobile ios`)
- [ ] Android emulator build runs (`pnpm --filter mobile android`)
- [ ] Release-build CI check confirms no `"99999 000"` or `"__DEV__ scenario"` strings in the production bundle

### 6.3 Shell completeness

- [ ] Every route in §3.1 exists as a real file
- [ ] Every route stub in §3.2 renders `<PlaceholderScreen phase="X" />`
- [ ] No `router.push()` call hits a missing route

### 6.4 Auth

- [ ] First-time flow: welcome → phone → OTP → profile-setup → home (dev OTP `000000`)
- [ ] Returning-user flow skips profile-setup
- [ ] Quick-login drawer visible in dev builds, invisible in release builds
- [ ] Dev bypass works in dev builds, rejected in release builds

### 6.5 Fixture + scenario switcher

- [ ] Triple-tap the `onlyou` wordmark opens the switcher in dev builds
- [ ] Each of the 4 scenarios updates every screen to match
- [ ] Gender visibility rules verified (male: no PCOS/period-tracker; female: no ED/PE)
- [ ] Switcher invisible + inert in release builds

### 6.6 Vertical coverage

- [ ] Hair Loss condition detail + questionnaire stub (with photo upload) works end-to-end
- [ ] ED condition detail + questionnaire stub (no photos) works end-to-end
- [ ] PE / Weight / PCOS cards render as "Coming Soon" teasers

### 6.7 Visual Biomarker Report

- [ ] Fixture renders the v2 design (Clinical Curator hero card, 3+ markers across all 3 states, sparklines, gradient range bars, vs-baseline comparison, download-PDF + message-doctor CTAs)
- [ ] Upload flow shows 3-second simulated "analyzing" → transitions to fixture report

### 6.8 CRO pass evidence

- [ ] `signup-flow-cro` invoked for welcome / phone-verify / OTP-entry plan tasks
- [ ] `onboarding-cro` + `app-onboarding-questionnaire` invoked for profile-setup and questionnaire-engine plan tasks
- [ ] `paywall-upgrade-cro` + `pricing-strategy` invoked for plan-selection
- [ ] `paywall-upgrade-cro` invoked for payment
- [ ] Each skill name grep-able in the relevant plan task comment

### 6.9 Code review (Rule 10)

- [ ] `superpowers:requesting-code-review` run on the full Phase 2 diff
- [ ] Every finding addressed or explicitly acknowledged
- [ ] Review report committed at `docs/superpowers/reviews/<date>-phase-2-patient-shell-review.md`

### 6.10 Deferral hygiene (Rule 9)

- [ ] No stale "open decisions" in `DEFERRED.md` Phase 2 section
- [ ] Every new deferral discovered during implementation is in the ledger with a named destination phase
- [ ] Any Phase 1 deferrals closed by Phase 2 are struck through with the closing commit

### 6.11 Founder approval gate

- [ ] Walks every tab on a real device (dev build)
- [ ] Flips switcher to each scenario and confirms each looks right
- [ ] Quick-logs into each of the 4 fake users via the drawer
- [ ] Reviews the biomarker report on a real device
- [ ] Explicitly records **"Phase 2 approved for Phase 2.5"** in `checkpoint.md`

## 7. Open items / follow-ups

None blocking Phase 2. The biomarker foundation phase (Phase 2.5) is sequenced and waiting — its own brainstorm begins after Phase 2 approval.

## 8. Cross-references

- Running deferrals: `docs/DEFERRED.md`
- Project rules: `CLAUDE.md` §RULES
- Design tokens: `docs/DESIGN.md`
- Patient app source doc + additions: `docs/APP-PATIENT.md`, `docs/APP-PATIENT-CHANGES.md`, `docs/APP-PATIENT-UPDATED-SECTIONS.md`, `docs/APP-PATIENT-ADDITIONS.md`
- Biomarker feature spec: `docs/FEATURE-BIOMARKER-TRACKING.md`
- Decision records:
  - `docs/decisions/2026-04-14-phase-2-navigation-ia.md`
  - `docs/decisions/2026-04-14-phase-2-fixture-and-auth-pattern.md`
  - `docs/decisions/2026-04-14-phase-2-additions.md`
- Phase 1 spec (for continuity): `docs/superpowers/specs/2026-04-13-phase-1-scaffold-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-04-13-phase-1-scaffold.md`
