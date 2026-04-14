# Phase 2A Foundation — Code Review

**Branch:** `feature/phase-2a-foundation` (worktree `D:/onlyou2-phase-2a`)
**Reviewer:** superpowers:code-reviewer (Opus 4.6)
**Date:** 2026-04-14
**Plan:** `docs/superpowers/plans/2026-04-14-phase-2a-foundation.md`
**Verdict:** **APPROVE-WITH-FIXES** (two minor fixes, one checkpoint omission; no blockers)

---

## Summary

Phase 2A delivers a clean, tight foundation layer for the patient app shell. All 16 planned tasks are present. Every planned file exists at the expected path (one naming difference in `packages/config` — see Finding I-1). Typecheck, lint, and Jest all clean per the pre-review verification (11 suites, 33 tests). The subagent execution preserved commit granularity and the TDD red→green rhythm the plan called for.

The implementation is honest about its scope: scenario switcher + fixtures + primitives + ESLint rule + test infrastructure, nothing more. Out-of-scope bleed is limited to (a) a single `loading` prop added to `PremiumButton`, (b) auto-format reformats from the lint setup, and (c) a small but necessary `Logo.tsx` hex-literal fix forced by the new ESLint rule. Nothing touches Phase 2B screen territory.

Two real Rule 8 (stay in scope) findings, one Rule 6 / task-16 omission (checkpoint not updated), and a handful of minor hygiene notes. All are addressable in ≤15 minutes.

---

## Findings

### Critical

None.

### Important

**C-1 — `checkpoint.md` was not updated (Rule 6 / Task 16 Step 7 skipped)**
File: `D:/onlyou2-phase-2a/checkpoint.md`
The checkpoint still reads "Current phase: Phase 1 … Next session: Phase 2 brainstorm." Task 16 Step 7 of the plan explicitly calls for a Phase 2A completion block with the delivered-items list; it was not committed. `CLAUDE.md` Rule 5 says the checkpoint must be updated every session, and the phase plan's own self-review leans on this file as the handoff to Plan 2B.
**Fix:** Append the block from the plan (Task 16 Step 7) before merge and commit as `chore(phase-2a/16): complete`.

**C-2 — `PremiumButton` `loading` prop added without spec authority (Rule 8 scope creep)**
File: `D:/onlyou2-phase-2a/apps/mobile/src/components/ui/PremiumButton.tsx:15-16,36,40-49`
The plan's Task 6 rewrites `PremiumButton` with `primary | secondary | ghost | warm` variants and a `disabled` prop. The subagent added a `loading?: boolean` prop that is not in the plan and is not tested (`__tests__/components/premium-button.test.tsx` never touches it). The comment even calls out that it is a visual passthrough with no `ActivityIndicator`, so it currently does nothing beyond what `disabled` already does. This is exactly the "refactors or improvements not in the plan" bleed Rule 8 warns against. It will also drift: Plan 2B / 2C will want a real loading spinner and will have to either respect this signature or break it.
**Fix (pick one):**

1. Remove the `loading` prop and related `isDisabled` branch. The four existing tests still pass; plan is honoured.
2. Keep it but add a failing test that documents its exact current semantics (button is disabled, nothing visual) and add an entry to `docs/DEFERRED.md` noting that the real loading spinner lands in Plan 2B or later.
   Option 1 is preferred per Rule 7 (keep it simple).

### Suggestions

**S-1 — `packages/config/eslint.base.js` path in the plan does not match reality**
File: `D:/onlyou2-phase-2a/packages/config/eslint/base.js`
The plan documents the file as `packages/config/eslint.base.js`; the actual file (from Phase 1) lives at `packages/config/eslint/base.js`. The implementer did the right thing and edited the real file. Nothing to fix in code — consider a one-line plan erratum at the bottom of the plan doc so Plan 2B doesn't trip on it.

**S-2 — Auto-format reformat of unrelated files during Task 4 (mild Rule 8 bleed)**
Files touched: `apps/mobile/src/components/ui/Logo.tsx`, `ScreenWrapper.tsx`, `apps/mobile/metro.config.js`, `apps/mobile/app.config.ts`, `apps/mobile/app/design.tsx`
When the ESLint / import-x swap landed (commit `ffb68e1`), prettier reformatted every file it touched — converting single quotes to double quotes, adding trailing semicolons, rewrapping multi-line arrays. None of the semantic content changed except two small forced fixes:

- `Logo.tsx` `'#FFFFFF'` → `colors.textInverse` (required to pass the new `no-hardcoded-hex` rule — good).
- `design.tsx` + `app.config.ts` got `/* eslint-disable onlyou/no-hardcoded-hex */` pragmas with justifications (both are correct carve-outs — the showcase page literally needs hex strings as label content, and Expo's native config can't import runtime token modules).
  The churn is noisy in the diff but harmless. For next phase: run `pnpm prettier --check` before the lint task so auto-format churn lands in a dedicated `style(phase-2a/0): pre-format baseline` commit rather than smuggling into feature commits.

**S-3 — `jest.config.js` corrects a typo that was latent in the plan**
File: `D:/onlyou2-phase-2a/apps/mobile/jest.config.js:4`
The plan's Task 2 Step 3 code block writes `setupFilesAfterEach` (not a real Jest option); the correct key is `setupFilesAfterEnv`, which is what the implementation uses. Silent save — worth noting for the plan erratum.

**S-4 — `test-provider.tsx` uses `require()` inside a React component body**
File: `D:/onlyou2-phase-2a/apps/mobile/src/test-utils/test-provider.tsx:20-22`
The lazy `require('@/stores/dev-scenario-store')` is defended in the comment as "avoid circular deps with the fixture file," but there is no actual circular-dep chain: `test-provider → store → fixtures` and `test-provider → fixtures` are both unidirectional. A plain top-of-file `import { useDevScenarioStore }` would work. Not worth a fix if it ships green — but Plan 2B should clean this up when it adds a `QueryClientProvider` wrapper, because the `require` pattern will not compose well with additional providers.

**S-5 — `mockRouter` uses local `mock*` prefixes for Jest hoisting — only partially correct**
File: `D:/onlyou2-phase-2a/apps/mobile/src/test-utils/mock-router.ts:10-24`
Jest's `mock` prefix rule only applies to module-scope top-level variables referenced inside `jest.mock()` factories — not function-scope locals. The prefix here is cosmetic and slightly misleading. Also: calling `jest.mock('expo-router')` from inside a regular function does **not** hoist the mock; it has to be called at module load. Current code will mock `expo-router` only after the first call to `mockRouter()`, which may be too late if any import chain already pulled `expo-router` in. No test in Plan 2A exercises router navigation so this is latent, but Plan 2B will hit it. **Fix for 2B:** Replace the helper with a top-level `jest.mock('expo-router', () => ({...}))` in `jest.setup.ts` plus a `resetRouter()` helper that returns fresh spies.

**S-6 — `modal.js` mock + `jest.setup.ts` guidance**
Files: `apps/mobile/__mocks__/modal.js`, `jest.setup.ts`
The comments explaining both crash chains (package-rooted and relative-form lazy getter in `react-native/index.js`) are excellent; keep them. The one-line nit: the `testID` prop is destructured as `_testID` but not forwarded to the mock fragment, so tests that look up `getByTestId('sheet')` on the Modal _itself_ would fail (they look up the overlay testID instead, which does work). Leave as-is — `BottomSheet`'s test suite only checks the overlay, so it's a dead branch.

**S-7 — `smoke.test.ts` references `jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper", …)` in the plan but not in the implementation**
The implementation dropped that mock from `jest.setup.ts`. Tests are green, so it's clearly not needed at current reanimated version. Worth noting for Plan 2B when more animation-heavy components (consultation screens) land — may need to revive it.

---

## Spec / plan compliance matrix

| Deliverable                                                    | Plan location  | Implementation location                                                                       | Status                                          |
| -------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Jest + jest-expo + RTL infrastructure                          | Task 1–2       | `apps/mobile/jest.config.js`, `jest.setup.ts`, `__mocks__/*`                                  | ✅                                              |
| `TestProvider` + `mockRouter`                                  | Task 3         | `src/test-utils/*`                                                                            | ✅ (see S-4, S-5)                               |
| `no-hardcoded-hex` ESLint rule                                 | Task 4         | `packages/config/eslint/no-hardcoded-hex.js`, `base.js`, `__tests__/no-hardcoded-hex.test.js` | ✅                                              |
| `PremiumInput` floating label                                  | Task 5         | `src/components/ui/PremiumInput.tsx`                                                          | ✅                                              |
| `PremiumButton` + `warm` variant                               | Task 6         | `src/components/ui/PremiumButton.tsx`                                                         | ✅ (+ unplanned `loading` prop — see C-2)       |
| `BottomSheet` primitive                                        | Task 7         | `src/components/ui/BottomSheet.tsx`                                                           | ✅                                              |
| `PlaceholderScreen`                                            | Task 8         | `src/components/placeholder-screen.tsx`                                                       | ✅                                              |
| `GenderGate` + `useGender`                                     | Task 9         | `src/components/gender-gate.tsx`, `src/hooks/use-gender.ts`                                   | ✅                                              |
| `FIXTURES` with 4 patient states                               | Task 10        | `src/fixtures/patient-states.ts`, `index.ts`                                                  | ✅                                              |
| `dev-scenario-store` (Zustand + AsyncStorage, `__DEV__` gated) | Task 11        | `src/stores/dev-scenario-store.ts`                                                            | ✅                                              |
| `usePatientState` hook                                         | Task 12        | `src/hooks/use-patient-state.ts`                                                              | ✅                                              |
| `ScenarioSwitcher` bottom sheet                                | Task 13        | `src/dev/scenario-switcher.tsx`                                                               | ✅                                              |
| `onlyou://` deep-link scheme                                   | Task 14        | `apps/mobile/app.config.ts:10`                                                                | ✅ (already present — correctly a no-op commit) |
| Root `_layout.tsx` + splash `index.tsx`                        | Task 15        | `apps/mobile/app/_layout.tsx`, `app/index.tsx`                                                | ✅                                              |
| `checkpoint.md` update                                         | Task 16 Step 7 | —                                                                                             | ❌ (see C-1)                                    |

**Test coverage vs plan expectation:**
Plan predicted ~10 test files, ~28 tests. Actual: 11 suites, 33 tests. Overshoot is driven by the patient-states fixture test (4 tests instead of 1) and gender-gate (4 tests instead of 1-2). Both are good — more coverage on the fixture contract that every later phase will rely on.

---

## Deviations from the plan

1. **Task 4 — `eslint-plugin-import` → `eslint-plugin-import-x` (commit `ffb68e1`).** Justified: ESLint 10 + `eslint-plugin-import` is a known-broken combination at the resolver layer. Swapping to `import-x` was the minimum fix. Not scope creep — it was a blocker for Task 4. ✅
2. **Task 6 — `loading` prop on `PremiumButton`.** Not in plan, not tested. Scope creep. See C-2. ❌
3. **Task 7 — `jest.setup.ts` mocks `react-native/Libraries/Modal/Modal` via `moduleNameMapper` + `__mocks__/modal.js`.** Forced by `babel-preset-expo` codegen crashing on native component specs. The production component still uses the real `Modal` from `react-native`; the mock exists only in the test pathway. Justified and well-commented. ✅
4. **Tasks 9/10/11 sequence compression.** Task 9 created skeletons of FIXTURES + the store early so Task 9's gender-gate tests had something to bind to, then Tasks 10/11 retroactively formalised them. The commit graph still reads left-to-right in plan order (`feat(phase-2a/9)`, `feat(phase-2a/10)`, `feat(phase-2a/11)`). Acceptable. ✅
5. **Task 12 — fixture name alignment (Priya Nair → Iyer, Sanjana Iyer → Rao).** Required because Task 13's `scenario-switcher.test.tsx` asserted on `getByText('Priya Iyer')` and `getByText('Sanjana Rao')`. The original plan used different surnames for these two fixtures. Pragmatic fix — no spec consequence. ✅
6. **Auto-format churn to `Logo.tsx`, `ScreenWrapper.tsx`, `design.tsx`, `metro.config.js`, `app.config.ts`.** See S-2. Mild scope bleed — acceptable this once, recommendation for next phase to split it. ⚠️

---

## Recommendations before merge

1. **[Required]** Add the Phase 2A completion block to `checkpoint.md` (copy from plan Task 16 Step 7, stamp today's date, add the merge SHA after merge). Commit as `chore(phase-2a/16): complete`.
2. **[Required]** Decide on C-2. Strongly prefer removing the `loading` prop. If kept, add a line to `docs/DEFERRED.md` under "Phase 2 — Patient app shell" noting "`PremiumButton.loading` currently no-op — real spinner pattern ships in Plan 2B / consultation flow."
3. **[Nice-to-have]** Add a one-line erratum to the plan file noting the `setupFilesAfterEach` → `setupFilesAfterEnv` typo and the `packages/config/eslint/base.js` path correction, so Plan 2B picks them up.
4. **[Required before Plan 2B starts]** Plan the `mockRouter` rewrite (see S-5) and the lazy `require` cleanup in `test-provider.tsx` (see S-4) as Plan 2B Task 0 housekeeping. Neither blocks merge.

## Recommendations for the plan process

1. **Pre-format the tree before landing a new lint rule.** When the Task 4 flip landed, prettier reformatted half a dozen files in the same commit as the rule introduction — making the diff noisy and slightly hiding the one semantically-meaningful change (the Logo hex fix). Next time: add a Task 0 sub-step "`pnpm prettier --write .` and commit as `style(...)`" before the lint rule lands.
2. **Verify the plan's file paths against Phase 1 output.** The `eslint.base.js` typo would have been caught by a 30-second check during plan authoring (`ls packages/config`). Low-effort fix for the writing-plans skill checklist.

---

## Verdict

**APPROVE-WITH-FIXES.**

Do C-1 and C-2 (both small), optionally address S-1/S-3 as a plan erratum, then merge. The foundation is solid, the test infrastructure is real (33 passing tests is not a vanity number — every component and hook has a contract test), the `__DEV__`-gated scenario store is elegant, the `usePatientState` hook is genuinely the right handoff seam for the Phase 2 → Convex cutover, and the `no-hardcoded-hex` rule will pay dividends for the rest of the build.

No security issues. No type-safety issues. No design-token violations. Nothing in this plan will need to be undone in Plan 2B.
