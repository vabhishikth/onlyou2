# Checkpoint

**Current phase:** Phase 2C — Tab content + consultation journey
**Status:** 🟢 READY TO MERGE on `feature/phase-2c-tab-content-consultation`
at `D:/onlyou2-phase-2c`. **57 commits ahead of master.** Second-pass code
review **APPROVE** (no Critical, no Important, 2 of 3 Suggestions applied;
S-17 left as known cosmetic). Founder final Expo Go re-verify is the last
gate before merge.

## Decisions at Plan 2C brainstorm (2026-04-14)

- **Dropped dev-client + EAS path.** Staying on Expo Go + SDK 54 — founder
  walkthrough loop works today and EAS/Apple creds aren't worth the friction.
  Both items struck through in `docs/DEFERRED.md` Phase 2B review deferrals row.
  Re-open only if a native module forces it.

## What shipped on the 2C branch (57 commits)

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
  profile-setup

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

### First-pass code review + fix pass (7 commits, 2026-04-14)

Review: `docs/superpowers/reviews/2026-04-14-phase-2c-tab-content-consultation-review.md`
verdict **APPROVE-WITH-FIXES**. All six fixes applied across commits
`5311594`, `7ab0b4e`, `a5f9516`, `f673bde`, `8e8bee9`, `466c450`.

### Walkthrough fixes (2026-04-15 → 2026-04-17, 12 commits)

Founder-driven fixes from iOS Expo Go acceptance testing:

| Commit    | Fix                                                                  |
| --------- | -------------------------------------------------------------------- |
| `c483fc1` | Profile-setup finish loop + triple-tap crash                         |
| `35b9861` | tsconfig: drop deprecated baseUrl + ignoreDeprecations               |
| `d80cefa` | Photo-upload grid (flexBasis/flexGrow) + lucide icons + tsc fix      |
| `61f0aa3` | Confirmation flips dev scenario to `reviewing`                       |
| `c00fdb9` | Home greeting uses real signed-in user name                          |
| `8ff6879` | Reviewing fixture: pcos → hair-loss                                  |
| `344b9c8` | Reset dev scenario on sign-in/out (interim; superseded by `3bc4db5`) |
| `3bc4db5` | Per-user dev scenario persistence — `scenariosByUser` map            |
| `820457e` | Vertical carry-through + tag dev switcher with `source: "dev"`       |
| `c321c63` | Swap identity everywhere on dev switch — introduces `useDisplayUser` |
| `5eb6ae4` | docs(review): second-pass walkthrough review                         |
| `4b55489` | Review nits (S-15 test assertion + S-16 defensive guard on hook)     |

### Second-pass code review (2026-04-17)

Review: `docs/superpowers/reviews/2026-04-17-phase-2c-walkthrough-review.md`
verdict **APPROVE**. No Critical, no Important, 3 Suggestions:

- **S-15** (`4b55489`) — added `expect(lastSource).toBe("flow")` to
  `subscription-confirmed.test.tsx`.
- **S-16** (`4b55489`) — `useDisplayUser` now guards the dev fallback with
  `lastSource === "dev" && activeUserId`. Defensive; unreachable today.
- **S-17** — **intentionally deferred**. Brief (<300ms) "Arjun" greeting
  flash during the auth query's loading window. Cosmetic only; a loading
  skeleton is scope-creep.

## Test counts at acceptance

- `pnpm --filter @onlyou/mobile test` — **150 passed** (44 suites)
- `pnpm test:convex` — **10 passed** (new suite — Pre-task A delivered)
- `pnpm typecheck` — clean across all 7 workspaces
- `pnpm --filter @onlyou/mobile lint` — clean (only pre-existing
  `MODULE_TYPELESS_PACKAGE_JSON` Node warnings, no errors)
- `pnpm lint` (root) still has pre-existing `next lint` failures in
  admin/doctor/landing apps — unrelated to 2C

## Next steps

1. **Founder final re-verify** on Expo Go (iOS) — shake → Reload, then run
   the identity swap checks below. Last gate before merge.
2. **Merge** `feature/phase-2c-tab-content-consultation` → `master`.
3. **Phase 2C completes.** Brainstorm Phase 2.5 (Biomarker foundation) —
   the next mini-phase between shell and Hair Loss per the build order.

## Final re-verify checks (identity swap — the last batch of walkthrough fixes)

Shake → **Reload** on Expo Go, then:

1. **Triple-tap → Priya (Under review)** — every surface reads "Priya Iyer":
   greeting "Thanks for submitting, Priya", avatar initials **PI**, profile
   screen shows Priya's name + phone + gender.
2. **Triple-tap → Sanjana (Treatment active)** — "Good morning, Sanjana",
   avatar **SR**, profile shows Sanjana. Activity tab has 1 out-for-delivery
   order. Messages tab has 1 conversation with Dr. Priya Sharma.
3. **Triple-tap → Priya → Messages tab** — should show Dr. Priya Sharma
   conversation (earlier report of "empty Messages" needs a last look).
4. **Fresh signup → ED consultation** — greeting uses YOUR real name;
   UnderReviewCard says "reviewing your **ED** case" (not hair-loss).
5. **Sign out and sign back in with same phone** — state restored.
6. **Sign out and sign up with a different phone** — fresh empty state.

## Branch + worktree

- Master: `1321292` (last pre-merge master tip)
- Phase 2C branch: `feature/phase-2c-tab-content-consultation`
- Worktree: `D:/onlyou2-phase-2c`
- Commits ahead of master: **57**

## Untracked / gitignored files (leave alone)

- `apps/mobile/.env.local` — `EXPO_PUBLIC_CONVEX_URL=https://aromatic-labrador-938.convex.cloud`
  Gitignored; must exist on any machine running the app.
- `convex/_generated/ai/` — auto-generated by `npx convex dev`, not part of 2C.
- `apps/mobile/expo-env.d.ts` — auto-written trailing-newline differences
  ignored during commits.

## Prior context (still valid)

- **Questionnaire content scope:** 2C ships with stubs (~4 questions).
  Real clinical content (28–32 questions per vertical) lands in each
  vertical's own phase (Phase 3 for hair-loss). Logged in DEFERRED.
- **Library upload on photo-upload:** deferred to Phase 3.
- **Camera black screen:** intentional Phase 2 mock. Real `expo-camera`
  wired in Phase 3.
