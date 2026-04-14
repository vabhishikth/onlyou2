# Phase 2 — Fixture-State + Pluggable Auth-Sender Pattern

**Date:** 2026-04-14
**Status:** Decided (Phase 2 brainstorm)
**Scope:** Establishes the canonical dev/QA pattern used by Phase 2 and inherited by every phase after it.

## Decision

Phase 2 ships two tightly-coupled mechanisms that together let anyone — founder, future devs, QA, automated tests — walk through the patient app in any state without touching real backend data.

### 1. Dev scenario switcher + fixture states

- **One fixture file:** `apps/mobile/src/fixtures/patient-states.ts` defines four patient-state objects: `new`, `reviewing`, `ready`, `active`.
- **One hook:** `usePatientState()` reads the current state and returns the right slice of fixture data for whatever screen is asking.
- **Hidden dev switcher:** triple-tap the `onlyou` wordmark in the header (or shake the device) → opens a sheet with 4 tappable rows. Picking a row updates the state globally and every screen in the app reflects the new state immediately.
- **Dead-code-eliminated in release builds:** the entire switcher + fixture loader is wrapped in `if (__DEV__) { … }`. A production build bundler strips it entirely.

### 2. Pluggable auth sender

- **Custom Convex Auth phone-OTP provider** — written in `convex/auth.ts` using `@convex-dev/auth`. Handles OTP generation, hashing, TTL, verification — all the real plumbing.
- **`OtpSender` interface** — the actual OTP _delivery channel_ (WhatsApp/SMS via Gupshup) is abstracted. The provider calls `otpSender.send(phone, otp)` and doesn't care how it gets there.
- **Phase 2 sender** = `ConsoleLogSender` — writes `[OTP] +91 99999 00001 → 000000` to Convex logs. Zero external dependency.
- **Phase 3 sender** = `GupshupSender` — one file, drop-in replacement. Rest of the auth code is untouched.
- **Dev OTP bypass:** in `__DEV__` builds, any OTP submitted for a number starting with `+91 99999 000` is accepted if it equals `000000`. Production builds reject it unconditionally — the `if (__DEV__)` block is dead-code-eliminated.
- **4 seeded fake users** matching the scenario-switcher states:
  - `+91 99999 00001` → New Arjun (state: `new`)
  - `+91 99999 00002` → Reviewing Priya (state: `reviewing`)
  - `+91 99999 00003` → Ready Rahul (state: `ready`)
  - `+91 99999 00004` → Active Sanjana (state: `active`)
- **Quick-login drawer** on the welcome screen (dev-only) — 4 tappable rows, each one auto-fills the phone, submits the stub OTP, and drops you into the app as that user.

## Why

1. **Founder walkthrough** — the non-technical founder can demo every app state at the Phase 2 approval gate in 30 seconds, not 30 minutes of seeding real data.
2. **TDD** — React Native Testing Library tests mock `ctx.auth.getUserIdentity()` to return one of the four seeded users, then assert UI reflects that user's state. No flaky OTP-send-and-poll in the test suite.
3. **Phase 3+ onboarding** — anyone picking up the project runs `pnpm dev` and has a working shell with a working login and 4 example states in under a minute. No "where do I get test credentials" friction.
4. **Gupshup risk isolation** — Indian WhatsApp Business onboarding can take days/weeks. Decoupling the sender means Gupshup delays cannot block the Phase 2 approval gate. The first day we have Gupshup ready, Phase 3 writes a ~30-line `GupshupSender.ts` and flips the import.
5. **Production safety** — every dev path is `__DEV__`-gated. Release builds contain no fake users, no dev switcher, no hardcoded OTP, no quick-login drawer. Guaranteed by bundler dead-code elimination, verified by a CI check that greps the built bundle for `99999 000` and fails if found.

## Consequences

- The scenario switcher becomes the canonical QA tool for _every_ future phase. Phase 3+ extends the fixture file and the `usePatientState()` hook as new business objects appear. Nothing replaces it.
- The `OtpSender` interface lives in `convex/auth/sender.ts` and is reused by any future phase that adds a second channel (e.g., email magic-link, a different country).
- Every phase's smoke tests (RN Testing Library) default to logging in as one of the four seeded users rather than building their own user fixture.

## Related

- [[DEFERRED|Deferred items ledger]] — Real Gupshup sender deferred to Phase 3, biometric lock + auto-logout deferred to Phase 8
- [[2026-04-14-phase-2-navigation-ia|Phase 2 navigation IA]] — the navigation context this fixture pattern feeds into
- `CLAUDE.md` Rule 9 — mandatory deferral tracking (this pattern is committed, not deferred)
