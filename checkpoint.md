# Checkpoint

**Current phase:** Phase 2C — Tab content + consultation journey
**Status:** 🟡 IN PROGRESS. Worktree `feature/phase-2c-tab-content-consultation`
at `D:/onlyou2-phase-2c`. 19 commits ahead of master. **Paused on rate limit
(resets 9:30pm IST 2026-04-14). Resume with Task 3 (home state-aware components).**

## Decisions at Plan 2C brainstorm (2026-04-14)

- **Dropped dev-client + EAS path.** Staying on Expo Go + SDK 54 — founder
  walkthrough loop works today and EAS/Apple creds aren't worth the friction.
  Both items struck through in `docs/DEFERRED.md` Phase 2B review deferrals
  row. Re-open only if a native module forces it.

## Progress on Plan 2C

### ✅ Pre-task A — convex-test harness + auth flow tests (shipped, 8 commits)

- vitest 4.1.4 + convex-test 0.0.48 + @edge-runtime/vm 5 at repo root
- `test:convex` script + root `vitest.config.ts` (oxc tsconfig discovery
  disabled as workaround for Vite 8 walking into `packages/core` tsconfig
  extends chain)
- Migrated lonely `convex/auth/__tests__/sender.test.ts` from jest → vitest,
  swapped `convex/tsconfig.json` types jest → vitest/globals
- 6 new auth tests in `convex/__tests__/auth.test.ts`: OTP lockout
  (`MAX_ATTEMPTS=3`), OTP expiry, dev-bypass happy path, dev-bypass under
  `NODE_ENV=production` (locks in current insecure behavior — will break
  intentionally when the gate is added), `finalizeSignIn` idempotency
  (1 user / 2 sessions), `signOut` deletes row + `getCurrentUser` returns null
- `api.d.ts` kept as hand-written stub — `CONVEX_DEPLOYMENT` was unset so
  regeneration wasn't attempted. Runtime `api.js` uses `anyApi`, stub already
  exports every module the new tests import
- `docs/DEFERRED.md` updated with new row: **"Dev OTP bypass has no NODE_ENV
  gate — works in prod. Deferred to Plan 3 alongside Gupshup wiring."**

### ✅ Pre-task B — Auth polish (shipped, 5 commits)

- `packages/core/src/validators/age.ts` + tests — `computeAgeYears` helper,
  handles leap years, impossible calendar dates, NaN on junk input. Exported
  via `@onlyou/core/validators/age` package export.
- Wordmark header on profile-setup (was missing on name/gender/DOB/address)
- Back chevron between profile-setup steps. Android hardware back via
  `useFocusEffect` + `BackHandler`; iOS swipe-back via
  `navigation.addListener('beforeRemove', ...)`. Both funnel through the same
  `goBackStep` callback via a ref to avoid stale closures.
- 18+ DOB enforcement: server-side `ConvexError("INVALID_DOB")` branch in
  `convex/users.ts::completeProfile` (also catches NaN input), client-side
  disabled Continue + red helper text. 3 new convex tests.
- OTP resend timer leak fixed (interval cleared at 0 + on unmount), OtpBoxes
  gained `resetSignal?: number` prop — parent bumps it on verify failure to
  clear the 6 boxes + refocus box 1. 2 new OtpBoxes tests.

### ✅ Pre-task C — CRO skill pass on auth screens (shipped, 4 commits)

Per-screen changes:

- **welcome** — new headline "Private care, delivered." + India-specific
  subhead, three accentWarm trust bullets (licensed Indian doctors / discreet
  packaging / private details), friction-reducer micro-copy under CTA
- **phone-verify** — subhead sets WhatsApp/SMS expectation, explicit privacy
  line under the input, CTA renamed Continue → Send code
- **otp-entry** — phone number echoed at top for sanity check, fallback error
  copy rewritten, new "Change number" text button below the resend
- **profile-setup** — 4-segment progress bar (accentWarm for completed), per-
  step stakes sub-copy explaining WHY we ask each field. No skip patterns —
  all fields required for a legally-prescribable consultation.

**Founder should sanity-check these copy choices at walkthrough time:**

- "Private care, delivered." vs previous "Private healthcare, delivered."
  (dropped "healthcare" to feel warmer, revertable)
- "No credit card" friction line — technically true (pay-after-prescription)
  but may read as US ecommerce idiom
- "We texted a 6-digit code" — "texted" because WhatsApp is messaging, could
  be "messaged" or "sent"
- "Discreet packaging, delivered home" trust bullet wording

**CRO recommendations rejected (documented):** social auth (Plan 3), hero
illustrations (no assets), skipping profile fields (all legally required),
trust logos / press badges (no assets).

### ✅ Plan 2C Task 1 — Extend FixtureUser slices (shipped, 1 commit)

- `apps/mobile/src/fixtures/patient-states.ts` gets typed slices for
  Consultation / Prescription / Order / Delivery / Message / Conversation /
  Subscription. 4 fixture users populated with state-appropriate data
  (arjun=new/empty, priya=reviewing w/ PCOS consultation, rahul=ready w/ Hair
  Loss plan + 3 meds, sanjana=active w/ PCOS sub + out-for-delivery order).
- **Kept** existing `user_arjun_001` userId format (plan said `fixture-arjun`)
  — zero external readers, would churn diff for no gain.
- **Kept** existing ages (28/32/35/30) — no code reads specific ages.
- **Dropped** `biomarkerReports` field — zero consumers, returns in Phase 2.5
  on its own terms.

### ✅ Plan 2C Task 2 — 5-vertical metadata table (shipped, 1 commit)

- New `apps/mobile/src/fixtures/verticals.ts` with 5 entries (hair-loss, ed,
  pe, weight, pcos): display name, category, photo requirement, gender filter,
  pricing tiers, `available` flag (only hair-loss + ED live in 2C)
- Added `visibleFor(gender)` helper for Explore gender filtering
- **Added 5 `verticalTint*` tokens to `packages/core/src/tokens/colors.ts`**
  — plan had hardcoded hex literals which violate the design system rule.
- **Fixed a Windows path bug in `packages/config/eslint/no-hardcoded-hex.js`
  in-scope** — token-file exclusion path was forward-slash-only, breaking
  `packages/core/src/tokens/` edits on Windows. One-line normalization.

### 🔴 Plan 2C Task 3 — Home state-aware components (NOT STARTED)

Agent dispatched and immediately hit the daily rate limit (resets 9:30pm
IST). Worktree is clean. **Resume here.** Plan section is at
`docs/superpowers/plans/2026-04-14-phase-2c-tab-content-consultation.md`
lines 705–1109. Five components:

- `ActiveTreatmentCard.tsx`
- `UnderReviewCard.tsx`
- `PlanReadyCard.tsx`
- `MedicationReminder.tsx`
- `DeliveryTrackingBanner.tsx`

All under `apps/mobile/src/components/home/` with one test each under
`apps/mobile/__tests__/components/home/`. Plan-ready CTA uses
`PremiumButton variant="warm"` per Clinical Luxe rule.

### ⏳ Tasks 4–22 (pending)

| Task | Scope                                             |
| ---- | ------------------------------------------------- |
| 4    | Home tab index 4-state rendering                  |
| 5    | Home tracking detail stepper                      |
| 6    | Explore grid + gender filter + ConditionCard      |
| 7    | Condition detail (Hair Loss + ED real, 3 teasers) |
| 8    | Stub questionnaire data (hair-loss + ed)          |
| 9    | Questionnaire shell components                    |
| 10   | Questionnaire modal stack layout                  |
| 11   | Questionnaire entry + gender branch               |
| 12   | Per-question screen                               |
| 13   | Questionnaire review                              |
| 14   | Photo upload stack + camera overlay               |
| 15   | Treatment stack + confirmation                    |
| 16   | Treatment plan-ready                              |
| 17   | Plan selection                                    |
| 18   | Payment (mocked)                                  |
| 19   | Subscription confirmed                            |
| 20   | Activity tab + detail                             |
| 21   | Messages tab (list + chat)                        |
| 22   | Final acceptance + code review + merge prep       |

## Test counts at pause

- `pnpm --filter @onlyou/mobile test` — **62 passed** (was 40 after Phase 2B)
- `pnpm test:convex` — **10 passed** (new suite this phase)
- `pnpm typecheck` — clean across all 6 workspaces
- `pnpm --filter @onlyou/mobile lint` — clean (root `pnpm lint` has
  pre-existing `next lint` failures in admin/doctor/landing apps — unrelated)

## Resume instructions

1. `cd D:/onlyou2-phase-2c && git status` — should be clean
2. `pnpm --filter @onlyou/mobile test && pnpm test:convex` — confirm 62 + 10
3. Re-dispatch Task 3 implementer with the prompt from this session (plan
   lines 705–1109) once the rate limit resets
4. Proceed sequentially through Tasks 4–22 via subagent-driven-development
5. Task 22 ends with `superpowers:requesting-code-review` and merge to master

## Branch + worktree

- Master: `5ed3b57` (Phase 2B merged + DEFERRED dev-client/SDK-bump drop)
- Phase 2C branch: `feature/phase-2c-tab-content-consultation`
- Worktree: `D:/onlyou2-phase-2c`
- Commits ahead of master: 19
