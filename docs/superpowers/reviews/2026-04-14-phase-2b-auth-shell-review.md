# Phase 2B Auth & Shell Skeleton — Code Review

**Branch:** `feature/phase-2b-auth-shell` (worktree `D:/onlyou2-phase-2b`)
**Reviewer:** superpowers:code-reviewer (Opus 4.6)
**Date:** 2026-04-14
**Plan:** `docs/superpowers/plans/2026-04-14-phase-2b-auth-shell-skeleton.md`
**Verdict:** **APPROVE-WITH-FIXES** (one security must-fix, one dead-code delete, one test-gap nit; the rest are hygiene)

---

## Summary

Phase 2B lands the full auth spine: extended Convex schema (`users` profile fields, `otpAttempts`, `sessions`), a `sendOtp`/`verifyOtp` action pair with hashed storage + dev bypass + attempt lockout, a Convex React client singleton on mobile, `expo-secure-store`-backed `auth-store`, `useCurrentUser`/`useSignIn` hooks, four auth screens (welcome + dev quick-login drawer, phone-verify, otp-entry, multi-step profile-setup), and the authenticated shell: a `(tabs)` layout with 4 tabs, a header wordmark + avatar, triple-tap scenario switcher, four placeholder tab screens, and a modal profile stack with sign-out. 21 commits, ~1,750 LOC net, no planned file missing.

The custom-auth architecture is reasonable for Phase 2 (fully under our control, easy Phase 3 swap to Gupshup). The `OtpSender` interface + `ConsoleLogSender` indirection is exactly the right seam. Typecheck, lint, and Jest are all clean (14 suites / 40 tests per the pre-review run — I re-ran lint and typecheck locally, both green). The design system is honored cleanly: no hardcoded hex found in any new file, 24px horizontal padding consistent across every screen, `<PremiumInput>` used on every text field so floating labels come for free, and `<BottomSheet>` is used for the dev quick-login drawer and scenario switcher.

Two real concerns. First, a latent **security issue** the implementer inherited from the plan verbatim: session tokens are generated with `Math.random()`. Second, a **dead-code duplicate** — `convex/users.ts:getCurrentUser` is a Phase 1 stub that still returns `null` and now lives alongside the real `convex/auth/sessions.ts:getCurrentUser` that the mobile hook actually calls. Everything else is hygiene (dead timer, stale-token corner case, test coverage, CRO skills not invoked).

No design-token violations. No scope creep into Plan 2C / 2D territory. No TypeScript hacks beyond the documented `as never` router casts. The `_generated/api.d.ts` hand-maintained stub is accurate and routes every public module correctly — safe until `convex dev` can run in CI.

---

## Findings

### Critical

**B-1 — Session token generation uses `Math.random`, not a CSPRNG**
File: `D:/onlyou2-phase-2b/convex/auth/otp.ts:181-186`

```ts
function generateSessionToken(): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}
```

This is the bearer token every subsequent request to Convex will authenticate with for 30 days. `Math.random()` is not cryptographically secure — V8's implementation is xorshift128+ with ~128 bits of _state_ but the output stream is predictable given a small number of observed values (published attacks exist against V8/Node's Math.random for auth-token generation). It was also seeded on process start; sessions minted close together from the same isolate are correlated.

The plan literally wrote this code (plan lines 488-494) with the comment "32 hex chars = 128 bits; good enough for dev + sufficient until Phase 3." That comment is wrong on two counts: (a) the _representation_ is 128 bits, the _entropy_ is not; (b) "sufficient until Phase 3" is hard to guarantee when the worktree already ships real `sendOtp`/`verifyOtp`. If this lands on master, any tester pointing a mobile build at the dev Convex deployment is minting tokens that leak their whole sibling token stream.

The file already has `"use node"` at the top, so Node's `crypto` is available at no extra cost.

**Fix:**

```ts
import { randomBytes } from "crypto";

function generateSessionToken(): string {
  return randomBytes(32).toString("hex"); // 256 bits, CSPRNG
}
```

Also update `convex/schema.ts:52` comment `// 32-byte hex` — currently false either way (32 chars = 16 bytes; with the fix it becomes 32 bytes = 64 hex chars). Rename to "`// 32-byte token, hex-encoded`" once `randomBytes(32)` is in.

This is a **must-fix before merge.** Recommend committing as `fix(phase-2b/security): session token CSPRNG` on this branch before the checkpoint commit.

### Important

**I-1 — `convex/users.ts:getCurrentUser` is a dead Phase 1 stub that should be deleted**
File: `D:/onlyou2-phase-2b/convex/users.ts:5-10`

The real `getCurrentUser` query now lives in `convex/auth/sessions.ts` and the mobile hook in `apps/mobile/src/hooks/use-current-user.ts:13` correctly calls `api.auth.sessions.getCurrentUser`. The old Phase 1 stub in `convex/users.ts` that always returns `null` was never removed and is still exported on the public API surface. Two problems:

1. `api.users.getCurrentUser` now shadows / competes with `api.auth.sessions.getCurrentUser` — any future caller that grabs the wrong one gets a silent "signed-out" result.
2. Plan 1's Task 6 is explicitly carried over in the spec as a stub; Plan 2B Task 4 was supposed to supersede it. The supersede step was missed.

**Fix:** Delete the `getCurrentUser` export from `convex/users.ts` (keep `completeProfile`). Regenerate `_generated/api.d.ts` (or hand-remove the `api.users.getCurrentUser` reference if the watcher still can't run). One-line commit: `fix(phase-2b): remove stale Phase 1 users.getCurrentUser stub`.

**I-2 — `signOut` on mobile only clears local secure-store; never calls `api.auth.sessions.signOut`**
File: `D:/onlyou2-phase-2b/apps/mobile/src/hooks/use-signin.ts:22-24`

```ts
async function signOut() {
  await clearToken();
}
```

The backend mutation `api.auth.sessions.signOut` exists and is correct, but nothing calls it. Consequence: the row in the `sessions` table survives until `expiresAt` (30 days later). If the device is lost or the token leaks to a logs channel, sign-out on the device does not revoke server-side — the leaked token still authorizes `getCurrentUser`. The plan's Task 19 profile-screen design explicitly references "invalidate the server session on sign-out"; this was dropped in implementation.

**Fix:**

```ts
import { useAction, useMutation } from "convex/react";
// ...
const signOutMutation = useMutation(api.auth.sessions.signOut);

async function signOut() {
  const token = useAuthStore.getState().token;
  if (token) {
    try {
      await signOutMutation({ token });
    } catch {
      // swallow — still clear locally even if server unreachable
    }
  }
  await clearToken();
}
```

Note: read `token` via `useAuthStore.getState()` not via a selector, because by the time `signOut` runs the consumer has already cleared local state in some flows.

**I-3 — Stale server-invalid token is never cleared from secure-store**
File: `D:/onlyou2-phase-2b/apps/mobile/app/index.tsx:17-20`

When `useCurrentUser()` returns `null` (not `undefined`), it means a token is present in the store but the server resolved it to no user — e.g. session expired, session deleted, or user row vanished. The current code redirects to `(auth)/welcome` but leaves the bad token in `expo-secure-store`. Any subsequent `getCurrentUser` call (e.g. on the profile screen during quick-login flow, or after re-hydration on next cold open) will pass the same stale token, get `null` back, and bounce again.

**Fix:** Before the redirect on the `user === null` branch, call `clearToken()` (idempotent). A `useEffect` wrapper is cleanest:

```tsx
useEffect(() => {
  if (token && user === null) {
    // server says the token is invalid — wipe it
    useAuthStore.getState().clearToken();
  }
}, [token, user]);
```

Rule 7 "keep it simple" — a one-liner, no architectural rework needed.

**I-4 — Zero tests for the Convex auth surface (the highest-risk code in the phase)**
Files: `convex/auth/otp.ts`, `convex/auth/sessions.ts`, `convex/users.ts:completeProfile`

The test suite has client tests for `auth-store`, `PhoneInput`, `OtpBoxes`, and the sender interface. It has **zero** tests for `sendOtp`, `verifyOtp`, dev bypass, `MAX_ATTEMPTS` lockout, OTP expiry, `finalizeSignIn`'s create-or-update branches, session expiry in `getCurrentUser`, or `signOut`. Every one of those paths is either security-sensitive or has a complex branch structure.

Convex provides `convex-test` for this exactly. The plan's Task 20 acceptance section is a manual walkthrough, which is fine for the founder demo but is not a regression safety net — Plan 2C will add new Convex surface area and we have nothing to diff against.

**Fix (recommended before merge):** Add at minimum three tests with `convex-test`:

1. `sendOtp` creates an `otpAttempts` row with `attempts: 0` and hashed non-plaintext OTP, and `upsertOtpAttempt` deletes any prior row for the same phone.
2. `verifyOtp` with the wrong OTP increments `attempts`; after 3 failures, a 4th call (even with the right OTP) throws "Too many attempts".
3. `finalizeSignIn` for a brand-new phone creates a `PATIENT` user with `profileComplete: false` and a fresh session; for an existing phone it reuses the user and mints a fresh session token.

If all-of-the-above is out of time budget, at least do (2) — it's the one that protects against OTP brute-force, and the lockout code path is currently untested. Alternatively, add to `docs/DEFERRED.md` under "Phase 2B → Plan 2C" with a named owner.

**I-5 — CRO skills (`signup-flow-cro`, `onboarding-cro`, `app-onboarding-questionnaire`) were not invoked**
Files: `apps/mobile/app/(auth)/welcome.tsx`, `phone-verify.tsx`, `otp-entry.tsx`, `profile-setup.tsx`

The plan calls these out at lines 11-14 and in Task headers for 13-16 as "CRO skills required at implementation time." The commits show no evidence the skills were run — copy and layout were written from plan text. Implications:

- **welcome.tsx:64-76** — headline "Private healthcare, delivered." + "Your free online visit starts here. A doctor reviews your case within 24 hours — completely free." is fine but untested against the `signup-flow-cro` CTA-framing patterns (loss aversion, specific time promise, social proof).
- **phone-verify.tsx:80** — "What's your phone number?" is the industry-standard opening; no form-field friction is visible but `signup-flow-cro` would typically want a one-line value-reinforcement ("No spam, no share") below the input, not just the generic SMS disclosure.
- **profile-setup.tsx:77** — `About you · {stepNumber} of 4` is a good progress indicator, but `app-onboarding-questionnaire` typically calls for percentage-complete bars, micro-commitment framing per step, and a "skip for now" affordance on non-critical fields (pincode/state are critical for delivery; DOB is critical for 18+ gate; street address arguably is not). The current flow is all-or-nothing.

**Recommendation: defer to a follow-up commit, not a blocker.** Reasoning: (1) the screens are functionally correct and the design system is respected, (2) running the three CRO skills will produce copy and structural changes that are easier to review in isolation than mixed with the rest of the phase, (3) the founder has not yet seen the screens visually so iterating on copy before the first visual approval is premature, (4) Plan 2C consultation flows will re-invoke the same skills and having a dedicated CRO pass across welcome/phone-verify/otp/profile-setup + consultation flow in one shot gives better continuity.

**Action:** Add a DEFERRED entry:

```
### Phase 2B → Plan 2C
- Run signup-flow-cro on welcome + phone-verify + otp-entry copy and layout (skills skipped during 2B implementation)
- Run onboarding-cro + app-onboarding-questionnaire on profile-setup (steps, copy, progress affordances, skip patterns)
- Owner: worker who opens Plan 2C
```

### Suggestions

**S-1 — `getAttempt` is defined as a `mutation` but only reads**
File: `D:/onlyou2-phase-2b/convex/auth/otp.ts:115-123`

The plan text at line 398 calls `ctx.runQuery(api.auth.otp.getAttempt, ...)` which implies a `query`. The implementation defines it as a `mutation` and calls it via `ctx.runMutation`. Functionally this works, but:

- Mutations serialize against all writers to the same documents. Every `verifyOtp` call takes a write slot just to read one row.
- Queries are cached (Convex reactivity) and run on read replicas.
- It's a plan drift the implementer absorbed silently; no comment explains why.

**Fix:** Change to `query` and switch the caller to `ctx.runQuery`. Trivially reversible if there's an undocumented reason (there isn't — I checked the plan and the Convex runtime; the only reason to use a mutation here would be if the read had to participate in the same transaction as a write, which it does not in the verify flow).

**S-2 — `OtpEntry` resend timer decrements forever**
File: `D:/onlyou2-phase-2b/apps/mobile/app/(auth)/otp-entry.tsx:20-27`

```ts
useEffect(() => {
  timer.current = setInterval(() => {
    setResendIn((s) => (s > 0 ? s - 1 : 0));
  }, 1000);
  return () => {
    if (timer.current) clearInterval(timer.current);
  };
}, []);
```

The interval keeps firing and calling `setResendIn(0)` (a no-op state update, but still a render per second) forever, even after the resend button becomes enabled. Also, when the user _does_ hit resend, `setResendIn(RESEND_SECONDS)` restarts the countdown but the interval is already running — so the timer continues on the same tick schedule, not a fresh one, which means the first decrement can happen in <1s.

**Fix (pick one):**

1. Clear the interval when `resendIn` hits 0 and restart it inside `onResend`. (More state plumbing.)
2. Simpler: store a `targetAt: number` (timestamp), compute `resendIn` from `Date.now()` on each tick, stop the interval when `resendIn === 0`. This also handles background/foreground transitions correctly.

Not a blocker — it ships green — but the fix is five lines and removes an endless render loop.

**S-3 — `OtpBoxes` has no way to clear on verification failure**
File: `D:/onlyou2-phase-2b/apps/mobile/src/components/auth/OtpBoxes.tsx:10-19`

The component holds its own state (`value`). When `onComplete(otp)` fires with 6 digits and the parent's `verifyOtp` rejects, the parent sets an error but the `OtpBoxes` still reads "000000". The user has to backspace six times to retry. No `reset` prop, no `imperativeHandle`, no `value` prop exposed.

**Fix:** Accept an optional `resetSignal?: number` prop (or a `ref` with `.clear()`). Not urgent — the current manual flow works — but Plan 2C / 2D will want it and retrofitting later is awkward.

**S-4 — Phone string format is fragile and not normalized at the boundary**
Files: `apps/mobile/app/(auth)/phone-verify.tsx:24`, `apps/mobile/src/fixtures/patient-states.ts`, `convex/auth/otp.ts:13` (`DEV_BYPASS_PREFIX`)

Phones are stored and matched as literal `"+91 99999 00001"` with spaces. This works today because every path constructs the string the same way, but:

- Real Gupshup integration in Phase 3 will send to E.164 (`+919999900001`, no spaces).
- If a future screen ever calls `sendOtp` with an unspaced phone, the dev bypass prefix match (`startsWith("+91 99999 000")`) silently fails.
- The `users.by_phone` index is a string index, so `"+91 99999 00001"` and `"+919999900001"` are two different keys.

**Fix:** Add a `normalizePhone(raw: string): string` helper in `packages/core/src/phone.ts` (strip spaces, ensure `+91` prefix, ensure 12 chars total). Call it at the edge of `sendOtp` and `verifyOtp` in Convex, and in the auth-store / fixtures on mobile. Update `DEV_BYPASS_PREFIX` to `+9199999000`. Not urgent — the whole phase works — but do it before Phase 3 Gupshup lands.

**S-5 — `profile-setup.tsx` gender picker isn't a bottom sheet**
File: `D:/onlyou2-phase-2b/apps/mobile/app/(auth)/profile-setup.tsx:100-138`

CLAUDE.md design rule: "Bottom sheets for all pickers, confirmations, and secondary inputs." The gender picker here is an inline three-button stack. Gender is arguably a primary input (one question per screen — which this does, since step 2 is only gender), not a picker within a screen, so the rule is debatable. The DOB step (step 3) is a raw text input with regex validation, which _really_ should be a bottom-sheet date picker — or at least a native date picker — but the plan explicitly punted date-picker UI: "Phase 8 polish." Both are consistent with plan intent. Leaving as-is is fine; flagging for Plan 2D when profile edit lands — re-use a real date picker there.

**S-6 — `profile-setup.tsx` missing 18+ enforcement despite showing the label**
File: `D:/onlyou2-phase-2b/apps/mobile/app/(auth)/profile-setup.tsx:149-163`

"Must be 18+ to use onlyou." is displayed under the DOB field, but the `disabled` check is `!/^\d{4}-\d{2}-\d{2}$/.test(dob)` — purely format. A user can type `2020-01-01` and proceed. The server-side `completeProfile` mutation also does not validate age.

**Fix (small):** Add a `isAdult(dob)` helper to the same file or `packages/core/src/dob.ts` and include it in the disabled expression. Mirror the check on the server side of `completeProfile`. This matters for regulatory / T&C reasons more than Phase 2B delivery.

**S-7 — Welcome screen "terms" link points to `/profile`**
File: `D:/onlyou2-phase-2b/apps/mobile/app/(auth)/welcome.tsx:112`

```tsx
<Text
  onPress={() => router.push("/profile" as never)}
  style={{ color: colors.accent }}
>
  terms
</Text>
```

This is clearly a placeholder but it's an unauthenticated user landing — they'll fail the auth gate and bounce back. Either `console.log("TODO: terms sheet")` it for Phase 8, stub a `PlaceholderScreen` at `app/legal/terms.tsx`, or remove the `onPress` entirely until Phase 8. Currently it's a footgun: tapping "terms" from the welcome screen breaks the auth flow.

**Recommend:** Remove the `onPress`, render the word plain. Commit as `fix(phase-2b): stub terms link on welcome screen`.

**S-8 — `PlaceholderScreen` `reason` copy bleeds Plan 2C naming into strings**
Files: `apps/mobile/app/(tabs)/home/index.tsx:7-9`, `explore/index.tsx`, `activity/index.tsx`, `messages/index.tsx`

The `reason` prop reads "Daily command centre with four patient states … Flip the scenario switcher to preview each state once Plan 2C ships." Fine for the dev walkthrough — but the founder approval gate is visual, and "Plan 2C" will show up in any screenshot the founder is looking at. Trivial fix: rephrase as "Coming in the next session" without the plan identifier. Not a blocker.

**S-9 — `completeProfile` uses the session token for auth instead of a request-level auth primitive**
File: `D:/onlyou2-phase-2b/convex/users.ts:12-41`

Passing the token in the args instead of through a Convex auth context works for Phase 2B but is non-idiomatic — it means every authenticated mutation signature leaks the token into the arg list and the callsite, and future observability / rate-limiting middleware can't distinguish auth from data args. `@convex-dev/auth` or a Convex `ctx.auth` adapter is the Phase 3 right answer. Leave as-is; add a `DEFERRED.md` entry noting "replace token-in-args auth with Convex auth context when Gupshup lands."

**S-10 — `auth-store` has a micro-TOCTOU in `setToken` (not a real bug, flagging for awareness)**
File: `D:/onlyou2-phase-2b/apps/mobile/src/stores/auth-store.ts:23-26`

```ts
async setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  set({ token });
},
```

If two `setToken` calls race (e.g. user double-taps "Verify"), the secure-store write ordering may not match the `set()` ordering. In practice this never happens because `verifyOtp` is sequential and the screen is single-button. Not worth fixing, but worth knowing if Plan 2C adds token refresh.

**S-11 — `convex/users.ts` no longer has an `import { v }` at the top but the plan told the implementer to add one**
File: `D:/onlyou2-phase-2b/convex/users.ts:1-3`

The plan (Task 4 Step 3) says "Add `import { v } from 'convex/values'` … at the top of `users.ts` if not already present." The implementer did add it (line 1), so this is correct. Mentioning only because the `featureFlags.ts` change in the same branch deleted an unused `v` import — opposite direction, both correct, but the two commits landing in quick succession caused me to second-guess. No action needed.

**S-12 — `_layout.tsx` returns `null` while fonts / hydration are loading**
File: `D:/onlyou2-phase-2b/apps/mobile/app/_layout.tsx:43`

`if (!fontsLoaded || !hydrated) return null;` This works because `SplashScreen.preventAutoHideAsync()` keeps the native splash visible until the effect runs `SplashScreen.hideAsync()` in the other effect. The two effects race subtly: if `hydrated` flips before `fontsLoaded`, the `null` return happens, then the hide effect fires — ordering is correct. Leave as-is. But: if `hydrate()` throws (e.g. SecureStore access denied), `hydrated` never flips and the app hangs on splash forever. Add a `.catch((e) => { console.warn(e); set({ hydrated: true, token: null }); })` on the hydrate call so a hard failure falls through to the signed-out branch.

---

## Spec / plan compliance matrix

| Deliverable                                             | Plan task | Status                                                                               |
| ------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------ |
| Extend schema (users profile, otpAttempts, sessions)    | Task 1    | ✅ (schema.ts:52 comment typo — see B-1 fix)                                         |
| `OtpSender` interface + `ConsoleLogSender`              | Task 2    | ✅                                                                                   |
| `sendOtp` + `verifyOtp` with hashed OTP + lockout       | Task 3    | ✅ (implemented as actions not mutations — justified, bcryptjs)                      |
| `getCurrentUser` query + `signOut` + `completeProfile`  | Task 4    | ⚠️ Stale `users.getCurrentUser` dead code (I-1); signOut not wired from client (I-2) |
| 4 fake user seeder (idempotent, fixture flag)           | Task 5    | ✅                                                                                   |
| `convex` + `expo-secure-store` + `bcryptjs` installed   | Task 6    | ✅                                                                                   |
| `ConvexReactClient` singleton                           | Task 7    | ✅                                                                                   |
| `auth-store` zustand + secure-store                     | Task 8    | ✅                                                                                   |
| `useCurrentUser` + `useSignIn`                          | Task 9    | ⚠️ `useSignIn.signOut` client-only (I-2)                                             |
| `PhoneInput` + `OtpBoxes`                               | Task 10   | ✅ (see S-3)                                                                         |
| Root `_layout.tsx` with ConvexProvider + hydration gate | Task 11   | ✅ (see S-12)                                                                        |
| Real splash routing                                     | Task 12   | ⚠️ Stale-token loop (I-3)                                                            |
| Welcome screen + dev quick-login drawer                 | Task 13   | ✅ (see S-7, I-5)                                                                    |
| Phone-verify screen                                     | Task 14   | ✅ (see I-5)                                                                         |
| OTP-entry screen                                        | Task 15   | ✅ (see S-2, S-3, I-5)                                                               |
| Profile-setup multi-step                                | Task 16   | ⚠️ 18+ not enforced (S-6); CRO skills skipped (I-5)                                  |
| `(tabs)` layout + wordmark triple-tap + avatar          | Task 17   | ✅                                                                                   |
| Placeholder tab index screens × 4                       | Task 18   | ✅ (see S-8 copy nit)                                                                |
| Profile stack placeholder + sign-out                    | Task 19   | ⚠️ signOut call missing server half (I-2)                                            |
| checkpoint.md update + merge prep                       | Task 20   | ⏳ not yet committed (expected per review protocol)                                  |

**Test coverage:** 14 suites / 40 tests (per pre-review verification). Covers client components, `auth-store`, and the sender interface. **Does not cover any Convex auth function.** See I-4.

---

## Deviations from the plan worth recording

1. **Role string changed from `"patient"` to `"PATIENT"`.** Correct — the plan's code block (line 453) disagreed with `packages/core/src/enums/roles.ts` which defines `ROLES` as uppercase. The implementer noticed and fixed it in `finalizeSignIn`, `seed/fake-users.ts`, and the schema's `roleValidator` (derived from `ROLES`). **Verified no remaining lowercase `"patient"` anywhere.** This is the single most important plan-drift the implementer caught. ✅
2. **`sendOtp` / `verifyOtp` implemented as `action` not `mutation`.** Plan header calls them mutations (plan line 5, "`sendOtp` mutation"); implementation uses `action` because `bcryptjs` needs Node runtime and requires `"use node"` which is action-only. Plan Task 3 code block actually uses `action` correctly — it's the plan's prose that's drift. Implementation matches the plan's code. ✅
3. **`convex/featureFlags.ts` normalized to project Prettier defaults + dropped unused `import { v } from 'convex/values'`.** Pre-existing lint debt from Phase 1 cleared during the Phase 2B schema-adjacent normalization pass. Stay-in-scope borderline — the file wasn't in Plan 2B's file list — but it was inside the `convex/` tree being actively worked, and the style normalization was the same change being made to `schema.ts` and `sender.ts`. Acceptable one-time. ⚠️ For Plan 2C: if any other Phase 1 file needs this pass, do it as a dedicated `style(phase-2c/0): normalize convex prettier` commit up front rather than smuggled into a feature commit.
4. **`schema.ts` and `sender.ts` normalized from single-quote/no-semi to double-quote/semi.** Same rationale as above; these two files were new in Phase 2B and should have been written to project Prettier from the start. Commit `fc528de` fixed it cleanly. ✅
5. **Convex files implemented as `getAttempt` mutation (not query) despite plan prose.** See S-1. Minor — fix in a follow-up.
6. **CRO skills (`signup-flow-cro`, `onboarding-cro`, `app-onboarding-questionnaire`) were not invoked during Tasks 13-16.** See I-5. Recommend deferring to a Plan 2C pre-task rather than retrofitting in this branch.
7. **Plan's `generateSessionToken` used `Math.random` — implementation preserved the bug.** See B-1. Must-fix.
8. **`completeProfile` placed in `convex/users.ts` while keeping the dead Phase 1 `getCurrentUser` stub.** See I-1. Must-delete the stub.

---

## Recommendations before merge

1. **[Blocker]** Fix B-1: swap `Math.random` session token for `randomBytes(32).toString("hex")`. Update schema.ts:52 comment. Commit as `fix(phase-2b/security): session token uses crypto.randomBytes`.
2. **[Required]** Fix I-1: delete `getCurrentUser` from `convex/users.ts`; regenerate (or hand-edit) `_generated/api.d.ts`. Commit as `fix(phase-2b): remove stale Phase 1 users.getCurrentUser stub`.
3. **[Required]** Fix I-2: wire `useSignIn.signOut` to call `api.auth.sessions.signOut` before clearing local secure-store. Commit as `fix(phase-2b): signOut invalidates server session`.
4. **[Required]** Fix I-3: clear stale secure-store token when `useCurrentUser()` returns `null`. One-effect addition to `app/index.tsx`. Commit as `fix(phase-2b): clear invalid token on splash`.
5. **[Required]** Fix S-7: remove the broken "terms" link on welcome screen. One-line change. Commit as `fix(phase-2b): stub terms link on welcome screen`.
6. **[Recommended before merge]** Add at least one `convex-test` for the OTP lockout path (I-4). The other two recommended tests can be deferred if time-boxed.
7. **[Recommended]** Add a DEFERRED.md entry listing: (a) CRO skills pass on auth screens — owner "Plan 2C kickoff", (b) convex-test coverage for the Convex auth surface, (c) phone normalization helper before Phase 3 Gupshup, (d) idiomatic Convex auth context when `@convex-dev/auth` is adopted. This is Rule 9 compliance — the items were decided during the phase review, they need a home.
8. **[Then]** Update `checkpoint.md` with the Phase 2B completion block per Task 20 Step 5 and commit.

## Recommendations for the plan process

1. **Audit plan code blocks for security issues before committing the plan.** The `Math.random` token is a plan-authored bug that a 30-second `grep -n "Math.random" docs/superpowers/plans/` pass would catch. Add this to the `writing-plans` skill's pre-commit checklist: "Any crypto primitives? Any auth primitives? Any token generation? Use CSPRNG."
2. **When a plan says "skill X required at Task N", have the execution skill enforce that.** Tasks 13-16 of this plan explicitly listed `signup-flow-cro` / `onboarding-cro` / `app-onboarding-questionnaire` as "CRO skills required at implementation time" and they were silently skipped. The `subagent-driven-development` / `executing-plans` skills could prompt for explicit acknowledgment when a task header names a required sub-skill.
3. **When a task's file list has both "modify users.ts" and "create a replacement elsewhere", call out the superseding explicitly.** The plan asked for a `getCurrentUser` in `convex/auth/sessions.ts` and a `completeProfile` add to `convex/users.ts`, but never said "delete the Phase 1 `getCurrentUser` stub from `users.ts`." That's how I-1 survived.
4. **The `ctx.runQuery` vs `ctx.runMutation` drift in Task 3 (plan line 398 says `runQuery`, the code block below defines `getAttempt` as a mutation) should have failed a type-check during plan authoring.** Convex's generated API is strict on this. Recommend: the `writing-plans` skill's code-block pass runs `pnpm --filter ... typecheck` against the planned files as a dry-run where feasible.

---

## Verdict

**APPROVE-WITH-FIXES.**

Do B-1 (the session token CSPRNG fix — non-negotiable; the branch should not merge with `Math.random` minting auth tokens), then I-1 through I-3 and S-7 (all tiny: delete, add one mutation call, add one effect, remove one onPress). Recommended: one `convex-test` for the OTP lockout path. Recommended: a DEFERRED.md entry rolling up the unrun CRO skills and the convex-test gap. Then update checkpoint and merge.

Everything else in the review is hygiene — S-1 through S-12 are real but don't block merge; most can be rolled into a Plan 2C Task 0 housekeeping pass alongside the CRO iteration.

The architecture is right. The design system is respected. The file layout matches the plan exactly. The custom-auth seam is clean and Phase 3 will be able to swap `ConsoleLogSender → GupshupSender` in a single file change exactly as promised. The fixture + real-auth pattern coexistence (dev bypass prefix + seeded `isFixture` users + triple-tap scenario switcher + dev quick-login drawer) is elegant — the founder can demo either path. This is a solid phase that needs one security fix and four small cleanups to ship.

No design-token violations. Lint clean. Typecheck clean. 14/14 suites green. Manual boot verification (iOS/Android/Expo dev server) is a required step not performed in this review environment — that remains on the implementer's checklist before merge per Task 20 Step 2.
