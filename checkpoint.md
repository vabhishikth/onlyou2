# Checkpoint

**Current phase:** Phase 2B — Auth + shell skeleton
**Status:** ✅ COMPLETE + visual fixes pass landed on master (2026-04-14). Ready to begin Plan 2C.

## Visual fixes pass (2026-04-14, post-review founder walkthrough)

Founder ran the Phase 2B build on iOS and surfaced a batch of bugs across
screenshots IMG_6126–IMG_6156. All fixed in a single same-day patch:

- **Splash + icon assets** — replaced yellow placeholder PNGs with the Playfair
  Display "onlyou" wordmark on `#FAFAF8` (1024×1024). Regenerated via a
  Playwright-rendered HTML → PNG pipeline (`splash.png`, `icon.png`,
  `adaptive-icon.png`, `favicon.png`). iOS home-screen label still uses the
  system font — that is OS-controlled, not ours.
- **`PremiumButton` primary variant was rendering invisible on-device.**
  Root cause traced to the `style={({pressed}) => ({...})}` function form
  on `Pressable` combined with RN 0.81 under the new architecture — the
  background color silently dropped on-device (tests passed, `/design`
  showcase passed in dev, only the real device flow showed the bug).
  Rewrote `PremiumButton` to render the pill inside a nested `<View>` so the
  Pressable only provides the touch layer. `resolveTokens()` is now a
  straight switch, no module-level eager `Record` object.
- **Tab bar had no icons.** Added `lucide-react-native` imports (Home,
  Compass, Activity, MessageCircle) via `tabBarIcon` on each `Tabs.Screen`.
- **Profile placeholder showed Period tracker for male users.** Row is now
  gated on `user?.gender === "female"` (gender type is lowercase — learned
  during fix; ROLES is uppercase but `Gender` is lowercase).
- **Phone-verify, OTP-entry, and profile-setup** all lacked keyboard handling
  — Continue / Next buttons lived under the keyboard with no dismiss path.
  Wrapped each screen in `KeyboardAvoidingView` (iOS: `padding` behavior)
  plus `TouchableWithoutFeedback` → `Keyboard.dismiss` for tap-outside.
- **DOB input was `YYYY-MM-DD` with numeric keypad** — impossible to type
  the dashes. Switched to Indian-natural `DD-MM-YYYY` with an auto-formatter
  that inserts dashes as digits arrive. Submit path converts to ISO
  (`YYYY-MM-DD`) before calling `completeProfile` so the DB stays
  ISO-compliant.
- **Address screen field order was wrong** — pincode came first. Reordered
  to envelope-natural: Street → City → State → Pincode. Pincode now uses
  numeric keypad with 6-digit cap.
- **`app test images/` added to `.gitignore`** — founder walkthrough
  screenshots stay local, not versioned.

**Deferrals from this pass** (tracked in `docs/DEFERRED.md` §Phase 2B visual
fixes pass 2026-04-14):

1. `onlyou` wordmark missing on profile-setup header (brand inconsistency)
   — Plan 2C auth polish.
2. No back navigation between profile-setup steps — typos on earlier steps
   are unrecoverable without signing out. Plan 2C auth polish.

**Manual acceptance:** founder walked the full funnel (welcome → phone →
OTP → name → gender → DOB → address → home + all 4 tabs + profile) on iOS
via IMG_6139–IMG_6156 and reported no remaining bugs.

---

## Original Phase 2B summary

## Last session (2026-04-14)

Executed Phase 2B via subagent-driven development in worktree
`feature/phase-2b-auth-shell`. ~28 commits across 20 plan tasks + 6 review
fixes + normalization, delivering full custom phone-OTP auth and the
authenticated 4-tab shell skeleton.

**Delivered:**

- Convex schema extended: `users` profile + gates, `otpAttempts`, `sessions`
  tables with indexes
- Custom auth: `OtpSender` interface + `ConsoleLogSender`, `sendOtp` /
  `verifyOtp` Convex actions (bcryptjs hashed OTP, dev bypass for
  `+91 99999 000xx` / `000000`), `getCurrentUser` query, `signOut` mutation,
  `completeProfile` mutation. Session tokens are 256-bit `node:crypto`
  randomBytes hex (NOT Math.random — fixed in review B-1)
- 4 seeded fake patients via idempotent `seedFakeUsers` internal mutation
- Mobile: `ConvexReactClient` singleton, `auth-store` zustand backed by
  `expo-secure-store`, `useCurrentUser` + `useSignIn` hooks
- `<PhoneInput>` (+91 prefix, 10-digit cap) + `<OtpBoxes>` (6-cell
  auto-advance) components with TDD coverage
- Auth screens: welcome (+ dev quick-login drawer for the 4 fixtures),
  phone-verify, otp-entry (30s resend timer), profile-setup
  (one-question-per-screen multi-step: name → gender → DOB → address)
- Root `_layout.tsx` rewired: `ConvexProvider` + auth-store hydration gate
  (splash holds until both fonts and hydrated are true)
- Real splash router at `app/index.tsx` — token + profileComplete gates,
  clears stale tokens when server rejects
- `(tabs)/_layout.tsx` — 4 tabs (home/explore/activity/messages) + custom
  header with wordmark (triple-tap → ScenarioSwitcher in `__DEV__`) +
  initials avatar pushing to `/profile`
- 4 placeholder tab `index.tsx` screens via `<PlaceholderScreen>`
- Profile stack placeholder with 12 row stubs + working sign-out (now
  invalidates the server session before clearing local secure-store)
- 14 test suites, **40 tests passing** — adds `auth-store`, `phone-input`,
  `otp-boxes` to Phase 2A's coverage
- `convex/_generated/api.d.ts` is a manually-maintained stub registering
  `auth/otp`, `auth/sessions`, `seed/fake-users`, `featureFlags`, `users`
  (the convex dev watcher cannot run in this environment — Plan 2C will
  reconcile when convex-test infra is added)

**Notable fixes outside Phase 2B scope** (in-scope because they were hidden
blockers for the rest of the phase):

- `convex/featureFlags.ts` lost an unused `import { v }` — pre-existing
  lint debt cleared during the prettier normalization pass
- All convex files normalized to project Prettier defaults (double quotes
  - semicolons). Phase 2A `convex/schema.ts` had been written with the
    wrong style and skipped the formatter

**Plan bug corrected during execution:** ROLES enum is UPPERCASE
(`'PATIENT'`), but the plan text used `'patient'`. The implementer used
`'PATIENT'` in `finalizeSignIn` and `seedFakeUsers` — schema validation
would have rejected the lowercase form.

**Code review:**
`docs/superpowers/reviews/2026-04-14-phase-2b-auth-shell-review.md`
verdict APPROVE-WITH-FIXES. All 6 fixes applied:

- B-1: `Math.random` session token → `node:crypto.randomBytes(32).toString("hex")`
- I-1: Deleted dead `convex/users.ts:getCurrentUser` stub (real one in `auth/sessions.ts`)
- I-2: `useSignIn().signOut()` now calls `api.auth.sessions.signOut` before clearing secure-store
- I-3: `app/index.tsx` clears stale local token when `useCurrentUser()` returns `null`
- S-7: Welcome "terms" link no longer points to authenticated `/profile` route
- DEFERRED: 5 review-time deferrals tracked in `docs/DEFERRED.md` (CRO skills, convex-test harness, phone E.164 normalization, 18+ DOB enforcement, OtpBoxes/timer hygiene) — all routed to Plan 2C or 3

**Manual acceptance status:** typecheck, lint, tests all green. Booting
Expo on iOS / Android is a remaining manual step before the founder
review (see Task 20 Step 2 in the plan).

## Next session

**Plan 2C — Tab content + consultation journey.** Will pre-task the
deferred CRO skill pass over the auth screens before extending into
home/explore/activity/messages real content. Begins with a fresh worktree
from master after Phase 2B merges.
