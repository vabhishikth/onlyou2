# Phase 2 — Patient App Navigation IA

**Date:** 2026-04-14
**Status:** Decided (Phase 2 brainstorm)
**Supersedes:** `APP-PATIENT.md` §1 "Bottom Tab Bar (5 tabs: Home | Explore | Activity | Messages | Profile)"

## Decision

The patient app uses **4 bottom tabs + a profile avatar in the top-right header**, not 5 bottom tabs.

```
┌─────────────────────────────┐
│  onlyou                 (AR)│  ← wordmark left, avatar right
│                             │
│   [ screen content ]        │
│                             │
│ ┌──┬──┬──┬──┐               │
│ │🏠│🧭│📋│💬│               │  ← 4 tabs: Home · Explore · Activity · Messages
│ └──┴──┴──┴──┘               │
└─────────────────────────────┘
```

- **Bottom tabs (4):** Home · Explore · Activity · Messages
- **Header top-right:** circular avatar (patient initials). Tap → pushes the Profile stack (personal info, subscriptions, prescriptions, orders, lab results, addresses, payment methods, notifications settings, etc.)
- **Header top-left:** `onlyou` wordmark in Playfair Display Black.

## Why

1. **Aesthetics** — the founder's explicit call. Profile in the tab bar is a utility, and tucking it behind an avatar reads as more premium. Matches the pattern Instagram, Airbnb, Notion, Linear, and most premium consumer apps use.
2. **Breathing room** — each of the 4 remaining tabs gets 25% of the bar width instead of 20%. Touch targets grow, visual hierarchy improves.
3. **Profile access frequency** — patients open Profile far less often than the other four tabs (Home daily, Explore when starting a journey, Activity when checking a delivery, Messages when the doctor replies). Demoting a rarely-used tab to an avatar button is correct for usage.
4. **Avatar as identity anchor** — the initials (or later, a real photo) give every screen a consistent "you are logged in as X" cue that the tab bar couldn't.

## Consequences

- `APP-PATIENT.md` §1 is overridden for navigation structure — this file is authoritative.
- The Profile stack is accessed via `router.push('/profile')` from the avatar button, not from a tab bar item. All deep links into profile sub-screens (`/profile/subscriptions`, `/profile/orders`, etc.) still resolve normally.
- On iOS the header uses a large-title style where appropriate (Home, Explore, Activity, Messages all use `Stack.Screen options={{ headerLargeTitle: true }}`). Profile sub-screens use standard titles.
- The Profile stack uses a modal sheet presentation on iOS, a pushed stack on Android — both feel native.

## Related

- [[DEFERRED|Deferred items ledger]] — Profile sub-screens that are deferred (wallet, period tracker, legal, help)
- `docs/DESIGN.md` — Clinical Luxe visual tokens used in the header and tab bar
