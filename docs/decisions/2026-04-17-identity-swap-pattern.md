---
date: "2026-04-17"
phase: 2c
status: implemented
tags:
  - pattern
  - architecture
  - dev-tooling
  - phase-2c
---

# Identity-Swap Pattern — Dev Scenario Switcher

**Date:** 2026-04-17
**Phase:** 2C (walkthrough fixes)
**Status:** Shipped on master at `54a7653`
**Commits:** `3bc4db5` (per-user persistence), `820457e` (source tagging), `c321c63` (useDisplayUser), `4b55489` (S-16 defensive guard)

Captures the architectural pattern introduced when the founder's Expo Go walkthrough surfaced identity-display bugs. Non-obvious from the code; write it down so future phases don't break the invariants.

---

## The problem

Phase 2C ships a triple-tap dev switcher that lets the founder jump between 4 fixture scenarios (Arjun new / Priya reviewing / Rahul plan-ready / Sanjana active) during walkthroughs. Early 2C had three bugs:

1. **Wrong vertical** on a new signup's home review card (hair-loss always, regardless of selected vertical).
2. **Wrong name** on display surfaces — after flipping to Priya, the home greeting still said "Arjun" because Convex `useCurrentUser` returned the real signed-in user.
3. **Scenario leaked across users** — signing out and back in with a different phone showed the previous user's scenario.

## The pattern

**Two identities coexist.** Keep them separate and route each surface to the right one.

| Identity         | Source                    | Use for                                          |
| ---------------- | ------------------------- | ------------------------------------------------ |
| **Real user**    | Convex `useCurrentUser()` | Auth routing, server mutations, any write path   |
| **Display user** | `useDisplayUser()` hook   | Home greeting, tab header avatar, profile screen |

`useDisplayUser` returns the fixture identity only when **both** conditions hold:

```ts
lastSource === "dev" && activeUserId;
```

Otherwise it falls through to the real Convex user. This means flow-driven scenario changes (real questionnaire submit → `reviewing`, real payment → `active`) and normal signed-in sessions always show the real user's name/phone/gender.

## Store invariants (`dev-scenario-store.ts`)

- **`scenariosByUser: Record<userId, PatientState>`** — each real Convex user gets their own scenario slot. Sign out + sign in as a different phone = fresh slot. Sign back in as the original phone = restored state.
- **`activeUserId: string | null`** — the Convex user the scenarios map is keyed by. Set on sign-in, cleared on sign-out (which also clears `lastSource`).
- **`lastSource: "dev" | "flow" | null`** — distinguishes switcher-driven changes from real-flow changes. Critical: only `"dev"` triggers the identity swap in `useDisplayUser`. Real-flow transitions must tag `source: "flow"` so the display stays on the real user.
- **`verticalsByUser: Record<userId, Vertical>`** — vertical chosen during consultation, per-user, so Priya's hair-loss and a new ED signup don't collide.

## Invariants future phases must preserve

1. **Never read `useDisplayUser` in an auth or mutation path.** It's display-only. Server calls must use the real user ID from Convex.
2. **Every `setScenario` call must name a source.** `"flow"` for real user actions (submit, pay), `"dev"` only for the triple-tap switcher. Forgetting this will make the real-flow transition visually swap identity.
3. **Sign-out must clear `activeUserId` AND `lastSource`.** The defensive `activeUserId` guard in `useDisplayUser` (S-16) covers drift, but the store is the source of truth.
4. **Per-user keying is non-negotiable.** Any new dev-only state that varies by scenario (flags, vertical, etc.) must be keyed by `activeUserId`, not global.

## Known carry-over

**S-17** — during the ~300ms Convex auth loading window after Reload, `currentUser === undefined` and the greeting briefly reads from the fixture before resolving. Cosmetic; a loading skeleton was scope-creep. Logged in DEFERRED.

## Files

- `apps/mobile/src/hooks/use-display-user.ts` — the hook.
- `apps/mobile/src/stores/dev-scenario-store.ts` — zustand store with all four invariants above.
- `apps/mobile/src/hooks/use-current-user.ts` — the real Convex identity (do not bypass).
