# Phase 2C Walkthrough-Fix Batch — Second-Pass Code Review

**Branch:** `feature/phase-2c-tab-content-consultation` (worktree `D:/onlyou2-phase-2c`)
**Reviewer:** superpowers:code-reviewer (Opus 4.7, 1M context)
**Date:** 2026-04-17
**Plan:** `docs/superpowers/plans/2026-04-14-phase-2c-tab-content-consultation.md`
**Scope:** `git log 466c450..c321c63` — 10 commits driven by founder iOS Expo Go walkthrough
**Verdict:** **APPROVE** (ready to merge; two small suggestions, no blockers)

---

## Summary

This second pass covers a tight, surgical fix batch on top of the first-pass-approved Phase 2C build. The thrust is coherent: every one of the 10 commits removes a concrete paper-cut the founder found on device, and the abstractions that emerged (`useDisplayUser`, `lastSource`, `verticalsByUser`, `SetScenarioOpts`) are scoped to the actual problem — the dev-time fixture layer — rather than bleeding into production code paths. The new tests (13 added across `dev-scenario-store`, `home-index`, `confirmation`, `scenario-switcher`) are purposeful and cover the tricky branches; nothing reads like a trivial-render filler.

**Green lights:**

- **Tests green.** 150/150 mobile tests across 44 suites pass locally. 10/10 convex tests pass. Zero TS errors, lint clean (only pre-existing node `MODULE_TYPELESS_PACKAGE_JSON` warnings that predate this batch).
- **`useDisplayUser` is the right shape.** The fallback chain (`source === "dev"` → fixture, else real `currentUser`, preserving `undefined` while loading and `null` when signed out) is exactly what the three callers (`home/index.tsx`, `(tabs)/_layout.tsx`, `profile/index.tsx`) need. The split between "display identity" (this hook) and "auth / mutation identity" (`useCurrentUser` directly) is explicit in the doc comment. This is a good dev-only indirection — it collapses cleanly back to `useCurrentUser` the day the dev store is retired, because every caller already treats the return as `DisplayUser | null | undefined`.
- **Per-user scenario + vertical scoping.** `scenariosByUser` + `verticalsByUser` fix the real walkthrough bug (two real sign-ins on the same device clobbering each other's demo state). The keyed-by-`activeUserId` design composes naturally with the existing OTP sign-in / sign-out flow; `use-signin.ts` calls `setActiveUser(userId)` after verify and `setActiveUser(null)` on sign-out with clear intent comments. Persistence via `@react-native-async-storage/async-storage` is correct (unchanged from first pass).
- **The `SetScenarioOpts` API change is fully propagated.** Every `setScenario` call site that had real semantic content was updated: `confirmation.tsx` (flow + vertical), `subscription-confirmed.tsx` (flow, no vertical — deliberately), and `scenario-switcher.tsx` (`source: "dev"`). Nothing was left on the default arg path in a way that would silently break source tagging.
- **Vertical threading is correct.** The flow-selected vertical lives on `useQuestionnaireStore.condition`, gets baked into `verticalsByUser[userId]` at submit time, and home reads it back via `useDevScenarioStore.verticalsByUser[activeUserId]`. Home's `useFixtureIdentity ? consultation?.vertical : (overrideVertical ?? consultation?.vertical)` is the right ternary: dev-switcher ignores the override (so a founder flipping to Priya sees Priya-as-intended), flow progression honors it (so an ED user doesn't see "reviewing your Hair-loss case"). This is the single-most-important correctness piece of the batch and it reads correctly.
- **Reviewing fixture moved off PCOS → Hair Loss (Priya).** Priya is `availableInPhase2: true` now, resolving a latent incongruity that was already flagged in the first-pass review's I-3 for Sanjana and was the same class of issue for Priya. Good catch during the walkthrough.
- **Profile-setup triple-tap crash + finish-loop fix.** The `beforeRemove` listener + `stepRef`/`finishingRef` pattern is the standard Expo Router escape hatch. The `finishingRef = true` before `router.replace` is exactly right — any other ordering will deadlock back-nav against the finish navigation. The `useRef` shadow of `step` for the listener closure is also correct; capturing `step` directly would have been stale.
- **Photo-upload grid cleanup** replaces the emoji camera/check with lucide icons (design-system compliant), and the `tsconfig.json` drop of deprecated `baseUrl` + `ignoreDeprecations` is a good hygiene fix — zero functional impact, removes a TS warning.
- **Scenario reset on sign-in/sign-out is correctly scoped.** First attempt (`344b9c8`) reset the whole store, which would have broken multi-session dev UX. The superseding commit (`3bc4db5`) correctly scopes to the per-user map, keeping returning logins state-restoring. Noticing the over-reset and fixing it on the same walkthrough is the right kind of iteration; the resulting design is better than either starting point.
- **Commit hygiene is exemplary.** Each commit is one conceptual fix, messages follow the `fix(phase-2c/walkthrough): ...` prefix consistently, and the ordering (finish-loop crash → tsconfig → photos → scenario flow → vertical carry → identity swap) tells a readable story. The `lastSource` fix was superseded by a better one mid-batch (`344b9c8` → `3bc4db5`) and the newer commit's message documents the relationship — no reviewer ambiguity.

**Concerns (two, both minor):**

1. **`subscription-confirmed.tsx` lost its test's source-tag coverage.** The screen now calls `setScenario("active", { source: "flow" })` but the existing test only asserts `activeScenario === "active"` — it doesn't exercise the new `source: "flow"` argument. Not a bug, but this is the exact pattern the `dev-scenario-store` tests caught (a later flow step calling `setScenario` without a `vertical` must not clobber the override). One more assertion per test would lock that contract in.
2. **Brief "Arjun" greeting flash on first sign-in.** During the window between `verifyOtp` resolving and `useQuery(getCurrentUser)` returning, `useCurrentUser` is `undefined`, `displayUser` is `undefined`, and home falls through to `user.name` (i.e. `FIXTURES[activeScenario].name`). For a brand-new user, `activeScenario` is `"new"` → `FIXTURES.new` → "Arjun Sharma", so the very first render after sign-in greets the real user as "Arjun". The fix-pass already addresses the steady state; this is a ~150–300ms transient. Acceptable for Phase 2C, but worth naming so Plan 3 retires it when real Convex user queries land.

No blockers. The batch can merge as-is.

---

## Findings

### Critical

_None._

### Important

_None._

### Suggestions

**S-15 — Add a `source: "flow"` + `vertical not clobbered` assertion to `subscription-confirmed.test.tsx`**
File: `D:/onlyou2-phase-2c/apps/mobile/__tests__/screens/treatment/subscription-confirmed.test.tsx:20-33`

Current test asserts the scenario flips to `"active"` and routes home, but doesn't exercise the `{ source: "flow" }` argument added in `61f0aa3` (and later reaffirmed by `3bc4db5`/`820457e`). Without this test, a future refactor that drops `{ source: "flow" }` from the call would:

- break the "greet with real name" invariant on the active home screen (home would read `lastSource === "dev"` and swap to fixture identity)
- pass CI silently

Recommended additions inside the existing test (or as a new sibling):

```ts
// After the button press:
const state = useDevScenarioStore.getState();
expect(state.activeScenario).toBe("active");
expect(state.lastSource).toBe("flow");

// And — parallel to the confirmation test — guard the vertical override:
// setting "active" from subscription-confirmed must NOT wipe a vertical
// the user picked at submit time.
```

Mirror the confirmation test's "flow-carried vertical survives across steps" block (`__tests__/stores/dev-scenario-store.test.tsx:92-104` already covers it at the store level, so this would be belt-and-braces at the screen level — keep either/both).

Priority: Suggestion. The store-level test covers the contract already; adding the screen-level assertion costs one line and catches the regression at the call site.

**S-16 — `useDisplayUser` returns the fixture when signed out but `lastSource` is still "dev"**
File: `D:/onlyou2-phase-2c/apps/mobile/src/hooks/use-display-user.ts:29-35`

In practice this path is unreachable in the current code because `setActiveUser(null)` in `use-signin.ts:39` always resets `lastSource: null` (verified by the store test at `__tests__/stores/dev-scenario-store.test.tsx:116-123`). But `useDisplayUser` doesn't encode that invariant — if the sign-out ordering ever drifts (e.g. a future fix that sets `lastSource` from somewhere else after `setActiveUser(null)`), the hook would still return the fixture's identity while signed out. That would show a demo user's name on the profile screen of an unauthenticated user.

Two tightening options:

```ts
// Option A: require an active user for the dev fallback
if (lastSource === "dev" && activeUserId) { ... }

// Option B: explicit sign-out check
if (lastSource === "dev" && currentUser !== null) { ... }
```

Option A is cleaner and doesn't depend on the `useCurrentUser` query timing.

Priority: Suggestion. Defensive hardening against a hypothetical future change, not a present bug.

**S-17 — Brief "Arjun" flash between `verifyOtp` resolution and `getCurrentUser` first return**
File: `D:/onlyou2-phase-2c/apps/mobile/app/(tabs)/home/index.tsx:28`

```ts
const displayName = displayUser?.name ?? user.name;
```

When `displayUser === undefined` (query loading), the fallback is `user.name = FIXTURES[activeScenario].name`. For a brand-new user who just signed in, `activeScenario === "new"` → "Arjun Sharma". The greeting flashes as "Welcome, Arjun." for the ~150–300ms it takes `useQuery(getCurrentUser)` to resolve. Once resolved, `displayUser.name` takes over and the greeting updates to the real first name.

Fix options:

- Replace the fallback with a skeleton / dash (`displayUser === undefined` → `"—"`) while loading. One line.
- Or suppress the greeting entirely until `displayUser` resolves to a concrete value.

Priority: Suggestion. Transient cosmetic only; most iOS signal-strength variations make this invisible. Worth a line of code if someone is already in this file.

---

## What I specifically checked

1. **`useDisplayUser` fallback chain.** Correct. `source === "dev"` returns fixture; `currentUser === undefined` returns `undefined`; `currentUser === null` returns `null`; otherwise shapes real user into `DisplayUser`. Gender coercion `(currentUser.gender ?? null) as Gender | null` is a safe narrowing — the Convex schema for users has an optional `gender` string, and `DisplayUser` accepts `null`. One soft corner flagged in S-16 (dev source + signed-out state reachability).

2. **`setScenario(scenario, { vertical, source })` call-site audit.** All three semantic call sites are updated:
   - `confirmation.tsx:20-23` — `{ vertical: selectedVertical ?? undefined, source: "flow" }` ✓
   - `subscription-confirmed.tsx:18` — `{ source: "flow" }` (no vertical, deliberately — store test 92-104 covers this) ✓
   - `scenario-switcher.tsx:52` — `{ source: "dev" }` ✓

   Default-arg behavior is correct: no opts → `source: "dev"`, vertical untouched. Tests cover this (`dev-scenario-store.test.tsx:65-79`).

3. **`verticalsByUser` edge cases.**
   - **Sign-out + different-user sign-in**: `setActiveUser(null)` clears the active pointer but preserves the map. `setActiveUser(newUserId)` loads `scenariosByUser[newUserId] ?? "new"` and `lastSource: null`. New user sees their own vertical (or none); old user's vertical is isolated in the map. ✓ (verified by store test `50-63` + `31-48`)
   - **No active user at submit time**: `verticalsByUser` is not mutated when `activeUserId === null`. Store test `106-114` covers this. ✓
   - **Subsequent flow step without vertical opt**: override preserved. Store test `92-104` covers this. ✓

4. **`lastSource` reset on `setActiveUser(null)`.** The choice to reset is correct. Rationale: `lastSource` is about what the currently-displayed scenario was driven by; after sign-out there is no currently-displayed scenario (it's "new"), so `null` is semantically correct. Persisting "dev" across sign-out would leak the fixture identity onto the welcome screen if any unauthenticated route ever rendered `useDisplayUser`. Not persisting per-user is also correct: `lastSource` is a per-session concept, not per-user.

5. **New tests sufficiency.** The 13 new tests (11 in `dev-scenario-store`, 2 in `home-index`, 1 in `scenario-switcher`, 1 in `confirmation`) cover:
   - scenario scoping per user ✓
   - sign-out map persistence ✓
   - `lastSource` defaulting ✓
   - explicit source recording ✓
   - vertical carry per user ✓
   - vertical NOT clobbered when next `setScenario` omits vertical ✓
   - no vertical mutation without active user ✓
   - `setActiveUser` resetting `lastSource` ✓
   - `resetScenario` wiping everything ✓
   - greeting reads fixture when `source: "dev"` ✓
   - greeting reads real user when `source: "flow"` ✓
   - `UnderReviewCard` reflects flow-carried vertical, not fixture ✓
   - switcher tags changes with `source: "dev"` ✓

   Only gap: `subscription-confirmed` screen-level `source: "flow"` assertion (see S-15).

6. **`__DEV__` gating.** The store has a dev branch + a release branch (lines 50-119). Release branch returns a frozen state with no-op mutators. `useDisplayUser` reads `lastSource` from whichever branch is active — in release, `lastSource` is always `null`, so the hook falls through to real `currentUser`. `useSignIn` calls `setActiveUser` via `getState()`, which is a no-op in release. This is correct dead-code elimination. The `if (!__DEV__) return null` guard in `scenario-switcher.tsx:35` belts-and-braces it. No production code paths depend on dev store state behaviorally. ✓

7. **Design-system compliance on touched screens.**
   - `home/index.tsx` — unchanged hex usage (all tokens), greeting text style unchanged, 24px horizontal padding preserved. ✓
   - `(tabs)/_layout.tsx` — avatar border uses `colors.textPrimary`, background `colors.accentLight`, initials `colors.textPrimary`. All tokens. ✓
   - `profile/index.tsx` — uses tokens throughout, unchanged design. ✓
   - `photo-upload/[condition].tsx` — swapped emoji for lucide `Camera` + `Check` icons, colored via `colors.accent` and `colors.textSecondary`. Per DESIGN.md this is the correct pattern. Still uses `‹` literal for back arrow (pre-existing, not introduced by this batch). The "Photos for your review" headline uses `PlayfairDisplay_900Black 28pt` with `-0.6` letter-spacing — matches the auth/consultation headline pattern. ✓

   No hex regressions.

8. **`docs/DEFERRED.md` audit.** No changes in the review range (`git log 466c450..c321c63 -- docs/` is empty). The four existing Phase 2C carry-forwards from the first pass are still valid — none of them were closed by this batch:
   - Treatment store for plan threading → still Plan 3 (unchanged; `verticalsByUser` is a dev-side patch, not real threading)
   - `plan-ready.tsx` consultationId param → still Plan 3 (untouched in this batch)
   - `subscription-confirmed` dev-store-flip → real Convex mutation → still Plan 3 (this batch added `source: "flow"` but the flip is still a dev-store flip)
   - Spacing token housekeeping → still Plan 8 (untouched)

   Rule 9 compliance: no new deferrals were introduced that would need a ledger entry. The `useDisplayUser` hook is explicitly called out in code comments as "Phase 3 replaces the fixture layer with real Convex queries" — that retirement is already covered by "Real Convex queries anywhere except auth → Phase 3+" in the ledger. No new entry needed.

---

## Spec / plan compliance (walkthrough batch)

This batch isn't driven by a spec task list — it's a founder-walkthrough bug-fix pass. Each commit is a discrete bug fix. The batch overall restores the Phase 2C plan's original intent (coherent dev-scenario switcher, flow state matching user selections) after the founder found edges the plan didn't anticipate.

| Walkthrough finding                                                        | Fix commit            | Status                                                     |
| -------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| Profile-setup "Finish" re-entering the flow + triple-tap crash             | `c483fc1`             | ✓                                                          |
| Deprecated tsconfig `baseUrl` + `ignoreDeprecations` TS warnings           | `35b9861`             | ✓                                                          |
| Photo-upload grid used emojis, breaking Clinical Luxe on iOS               | `d80cefa`             | ✓                                                          |
| After consult submit, home showed "new" instead of "reviewing"             | `61f0aa3`             | ✓                                                          |
| Home greeting used fixture name even after real sign-in                    | `c00fdb9`             | ✓ (superseded + extended by `c321c63`)                     |
| Priya fixture was PCOS (not `availableInPhase2`)                           | `8ff6879`             | ✓                                                          |
| Dev scenario persisted across sign-out/sign-in as wrong user               | `344b9c8` → `3bc4db5` | ✓ (second commit is the correct form, first is superseded) |
| ED user who submitted saw "reviewing your Hair-loss case"                  | `820457e`             | ✓                                                          |
| Dev switcher only flipped scenario, not identity (avatar/profile mismatch) | `c321c63`             | ✓ (introduces `useDisplayUser`, swap now universal)        |

---

## Deviations or risks worth recording

1. **Dev store now has production-adjacent reach.** `useDisplayUser` is imported by three production screens (`home/index.tsx`, `(tabs)/_layout.tsx`, `profile/index.tsx`) and reads `lastSource` from the dev store. In release builds the store's release branch returns `lastSource: null` and all mutators are no-ops, so the hook transparently falls through to real `currentUser`. This is correct and tested. But the mental model "dev store is only touched by dev screens" is now false — it's touched by all three display screens. The code comments are clear about this ("Use this for DISPLAY only. Auth routing and server mutations must still read `useCurrentUser` directly"). Document this in the Phase 3 brainstorm: when `useDisplayUser` is retired, all three call sites become plain `useCurrentUser()`. Worth a note in `docs/DEFERRED.md` under the existing Phase 3 block — not critical, just a forward-looking breadcrumb.

2. **`verticalsByUser` override is intentionally fixture-bound.** The override only applies when `useFixtureIdentity === false` (flow mode). In dev-switcher mode, the fixture's own vertical is used verbatim. This is correct for the demo UX (a founder flipping to Priya expects the Priya fixture to be consistent with itself). The comment in home.tsx:37 explains this. No issue.

3. **No new test for the `profile-setup` `beforeRemove` + `stepRef` pattern.** The existing `profile-setup.test.tsx` predates this fix and didn't need changes to keep passing. A unit test of the back-navigation within the step sequence would be nice (e.g. assert that mounting on step 2 and firing `beforeRemove` calls `setStep("name")`) but is bounded by `react-navigation` mocking complexity — not worth the effort for a pattern that's going to be replaced when the questionnaire engine retires it. Flag for awareness; no action.

---

## Verdict

**APPROVE.**

No blockers. Two cheap suggestions:

1. (S-15) Add a `lastSource === "flow"` assertion to the `subscription-confirmed` test. ~1 line.
2. (S-16) Tighten `useDisplayUser` so the dev fallback requires `activeUserId`. ~1 line. Defensive.

Optionally (S-17) suppress the "Arjun" greeting flash during the first post-sign-in render window. ~2 lines.

The batch is high-quality. The `useDisplayUser` indirection is a genuinely good piece of surgery — it solved the "identity swap" walkthrough bug without leaking dev concerns into production auth or mutation paths, it has a clean doc comment, and it compresses to a single deletion when Phase 3 lands real Convex user queries. The per-user scenario + vertical scoping is the right fix for the real multi-sign-in device bug and the tests pin every branch of the contract. The supersession of `344b9c8` by `3bc4db5` is a sign of good mid-batch self-review, not churn — the second commit's message is explicit about why the first was wrong.

Founder walkthrough on iOS Expo Go is the right forcing function for Phase 2C — the bugs this batch fixed could not have been caught by tests alone (they were all "the fixture is right but the journey feels wrong" bugs). The fix pattern — one commit per bug, carry the founder's vocabulary into the commit message (`walkthrough`), keep the fix in scope, add targeted tests — is the pattern to repeat in Phase 3.

Ready for merge after the optional suggestions. If any of S-15/S-16/S-17 are taken, fold them into a single `fix(phase-2c/walkthrough): review nits` commit; none need their own commit.

Manual device re-verify on iOS Expo Go (sign in → triple-tap-switch → sign out → sign in as different user → triple-tap-switch → submit real consult as ED) remains a founder-side step before merge. The batch has been test-verified; device re-verify is confirmation that the walkthrough bugs really are gone, not a review gate.

No design-token violations. Lint clean. Typecheck clean. 150/150 mobile, 10/10 convex. DEFERRED ledger still valid (no new entries needed). CLAUDE.md rules honored. Phase 2C is ready for checkpoint update and merge.
