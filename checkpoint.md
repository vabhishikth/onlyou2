# Checkpoint

**Current phase:** Phase 2C — Tab content + consultation journey
**Status:** ✅ CODE COMPLETE on `feature/phase-2c-tab-content-consultation`
at `D:/onlyou2-phase-2c`. 42 commits ahead of master. Code review APPROVE-WITH-FIXES
landed and **all 6 review fixes shipped (I-1 through I-5 + S-14)**. **Awaiting
founder walkthrough + merge to master.**

## Decisions at Plan 2C brainstorm (2026-04-14)

- **Dropped dev-client + EAS path.** Staying on Expo Go + SDK 54 — founder
  walkthrough loop works today and EAS/Apple creds aren't worth the friction.
  Both items struck through in `docs/DEFERRED.md` Phase 2B review deferrals row.
  Re-open only if a native module forces it.

## What shipped on the 2C branch (42 commits)

### Pre-tasks (17 commits)

- **Pre-task A** (8 commits) — convex-test harness on Vitest, 6 new auth tests
  (OTP lockout, expiry, dev bypass × 2, finalizeSignIn idempotency, signOut),
  migrated `sender.test.ts` from jest, hand-written `_generated/api.d.ts` stub
  retained, dev-OTP-bypass NODE_ENV gap flagged in DEFERRED for Plan 3
- **Pre-task B** (5 commits) — `computeAgeYears` validator in `@onlyou/core`,
  wordmark on profile-setup, back nav between profile-setup steps (iOS swipe
  - Android hardware back via shared `goBackStep` callback), 18+ DOB enforced
    client + server, OTP resend interval cleanup + OtpBoxes resetSignal
- **Pre-task C** (4 commits) — CRO pass on welcome / phone-verify / otp-entry /
  profile-setup. Founder still needs to sanity-check 4 copy choices flagged
  in the Pre-task C report (e.g. "Private care, delivered." headline)

### Plan 2C tasks (18 commits, Tasks 1–21)

| Task | Scope                                                | Commit    |
| ---- | ---------------------------------------------------- | --------- |
| 0    | Empty marker + worktree                              | `e1d04fd` |
| 1    | FixtureUser typed slices + populated 4 fixtures      | `75859a9` |
| 2    | 5-vertical metadata + tint tokens + Win path fix     | `4b579d3` |
| 3    | 5 home state-aware components                        | `2958619` |
| 4    | Home tab 4-state rendering                           | `698665f` |
| 5    | Home tracking detail (delivery stepper)              | `99d11d1` |
| 6    | Explore grid + gender filter + ConditionCard         | `c5ddd0e` |
| 7    | Condition detail (hair-loss + ED real, 3 teasers)    | `d0a325f` |
| 8    | Stub questionnaire data (hair-loss + ed)             | `aa0004f` |
| 9    | Questionnaire shell components                       | `2b01f9b` |
| 10   | Questionnaire modal stack layout                     | `1ccf2b3` |
| 11   | Questionnaire entry + female hair-loss block         | `86e2ef9` |
| 12   | Per-question screen + zustand store                  | `28d95c0` |
| 13   | Questionnaire review + submit                        | `fc6aaae` |
| 14   | Photo upload stack (mocked camera)                   | `32e9663` |
| 15   | Treatment stack + confirmation                       | `469efcd` |
| 16   | Treatment plan-ready                                 | `7cfddcd` |
| 17   | Plan selection                                       | `a47cf8a` |
| 18   | Payment (mocked Razorpay)                            | `b5fe550` |
| 19   | Subscription confirmed + dev-scenario flip to active | `cd072b7` |
| 20   | Activity tab + detail + shared DeliveryStepper       | `9926632` |
| 21   | Messages tab list + read-only chat                   | `5be3180` |

### Code review + fix pass (7 commits)

Review: `docs/superpowers/reviews/2026-04-14-phase-2c-tab-content-consultation-review.md`
verdict **APPROVE-WITH-FIXES**. All six fixes applied:

- **I-1** (`5311594`) — payment screen now reads `plan` + `vertical` from
  router params instead of hardcoding "₹2,299". `plan-selection.tsx` passes
  the chosen tier through. New test asserts both quarterly and 6-month totals.
- **I-2** (`7ab0b4e`) — `confirmation`, `subscription-confirmed`, and
  `photo-upload/camera` CTAs now use `variant="warm"` per Clinical Luxe rule.
- **I-3** (`a5f9516`) — Sanjana fixture reassigned from PCOS (unavailable in
  Phase 2) to hair-loss with Dr. Priya Sharma + Minoxidil 2% / Biotin /
  Ferritin combo. Updated dependent test assertions across 5 test files.
- **I-4** (`f673bde`) — `plan-ready.tsx` "What to expect" bullets are now
  vertical-agnostic ("private packaging" / "track in Activity tab" / "message
  your doctor anytime").
- **I-5** (`f673bde`, same commit as I-4) — removed decorative `💊` emoji
  from medication list per Clinical Luxe rule.
- **S-14** (`8e8bee9`) — cleared two import-order lint warnings in
  `question-shell.test.tsx`.
- **DEFERRED carry-forwards** (`466c450`) — four review-recommended deferrals
  added under "Phase 2C review deferrals (2026-04-15)": treatment store,
  consultationId param threading, real subscription activation mutation
  (all → Plan 3), spacing token housekeeping pass (→ Plan 8).

## Test counts at acceptance

- `pnpm --filter @onlyou/mobile test` — **136 passed** (+76 from Phase 2B's 60
  baseline; +75 from Plan 2C scope including the +9 review-fix updates)
- `pnpm test:convex` — **10 passed** (new suite — Pre-task A delivered)
- `pnpm typecheck` — clean across all 6 workspaces
- `pnpm --filter @onlyou/mobile lint` — clean (only `MODULE_TYPELESS_PACKAGE_JSON`
  Node warnings, no errors)
- `pnpm lint` (root) still has pre-existing `next lint` failures in
  admin/doctor/landing apps — unrelated to 2C

## Walkthrough notes for the founder

What to look for when running this on iOS Expo Go:

1. **Dev scenario switcher** is still the triple-tap-on-wordmark gesture from
   Phase 2B — flip between new / reviewing / ready / active to walk all four
   home states. Sanjana (`active`) is now the hair-loss scenario, NOT pcos —
   so tapping Hair Loss in Explore from the active state should stay clean.
2. **End-to-end consultation flow** — start as `new`, hit Explore → Hair Loss
   → "Start consultation" → questionnaire → photo upload (mocked) → review →
   Submit → confirmation. Tap "Back to home" — confirmation pops you to home.
3. **Plan-ready → payment → confirmed** — switch to `ready` scenario, tap the
   PlanReadyCard CTA on home, walk through plan-selection (try monthly /
   quarterly / 6-month — payment screen now shows the right total), tap Pay,
   wait ~1.5s for the mocked Razorpay sweep, hit "Go to home" — the dev store
   flips to `active` and home re-renders accordingly.
4. **Activity + Messages tabs** in the `active` state show real fixture
   content — sanjana's hair-loss order out-for-delivery, conversation with
   Dr. Priya Sharma. Chat input is intentionally disabled with a "Coming soon"
   hint.
5. **Copy to sanity-check** (from Pre-task C report): "Private care, delivered."
   headline, "No credit card" friction line on welcome, "We texted a 6-digit
   code" wording on phone-verify, "Discreet packaging, delivered home" trust
   bullet, "Choose your plan →" arrow on plan-ready CTA.

## Next steps

1. **Founder runs** the full walkthrough on Expo Go (iOS) against the
   `feature/phase-2c-tab-content-consultation` branch. Catch anything that
   looks/feels wrong.
2. **Same-day visual fix patch** if needed (matching the Phase 2B pattern).
3. **Merge** `feature/phase-2c-tab-content-consultation` → `master`.
4. **Phase 2C completes**, `checkpoint.md` updated, brainstorm Phase 2.5
   (Biomarker foundation) — that's the next mini-phase between shell and
   Hair Loss per the build order.

## Branch + worktree

- Master: `a028640` (checkpoint after the rate-limit pause earlier this session)
- Phase 2C branch: `feature/phase-2c-tab-content-consultation`
- Worktree: `D:/onlyou2-phase-2c`
- Commits ahead of master: **42**
