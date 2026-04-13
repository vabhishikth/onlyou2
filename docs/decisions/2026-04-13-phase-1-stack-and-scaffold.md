---
date: '2026-04-13'
phase: 1
status: approved
tags:
  - decision
  - phase-1
  - stack
  - monorepo
  - design-system
---
# Phase 1 — Stack, Scaffold, and Design System Decisions

**Date:** 2026-04-13
**Phase:** 1 of 8 (Monorepo scaffold + Convex + design system)
**Status:** Approved by founder during brainstorming session
**Full spec:** [[superpowers/specs/2026-04-13-phase-1-scaffold-design]]

This note captures the architectural decisions made during the Phase 1 brainstorming session. It is meant to be the quick-lookup record — the full spec has the detail, this has the "why."

---

## Decisions

### D1. Scaffold 4 apps, defer 3 portals to Phase 6

**Decision:** Phase 1 scaffolds `apps/mobile`, `apps/landing`, `apps/doctor`, `apps/admin`. The nurse, lab, and pharmacy portals are not scaffolded until Phase 6.

**Why:** Matches the CLAUDE.md build order. Scaffolding apps we won't touch for weeks creates dead maintenance surface. The v1 layout in [[ONLYOU-SOURCE-OF-TRUTH#10. Monorepo & Domains|SOURCE-OF-TRUTH §10]] lists 7 apps; we only need 4 for the first 5 build-order phases.

**Alternative considered:** "Everything at once" — scaffold all 7 apps now. Rejected because nurse/lab/pharmacy are PWAs with different setup (manifest, service worker) that we shouldn't design in isolation from their actual features.

---

### D2. Tailwind 4 on web, Tailwind 3 on mobile

**Decision:** Next.js apps use Tailwind 4 (CSS-first config via `@theme` in `globals.css`). Expo mobile app uses Tailwind 3.4 because NativeWind 4.1 does not yet support Tailwind 4.

**Why:** Latest shadcn/ui defaults to Tailwind 4. CLAUDE.md rule: "Always use latest stable versions. Pin exact." Downgrading web to Tailwind 3 just to match mobile means we'd migrate web later anyway.

**How the split stays clean:** All design token *values* (colors, spacing, shadows, radii, fonts) live once in `@onlyou/core/tokens` as plain TypeScript constants. Web consumes them via an `@theme` block in `packages/ui/src/styles/globals.css`. Mobile consumes them via `apps/mobile/src/theme/` which re-exports and reshapes as needed. One source, two renderers.

**The only asymmetry:** shadows. Web uses `box-shadow` strings; RN uses `{shadowColor, shadowOffset, ...}` objects. `shadows.ts` exports both forms per token (`.web` and `.native`), and each platform picks its side.

---

### D3. Hybrid `packages/ui` — shared branded primitives, app-local for the rest

**Decision:** `packages/ui` holds *branded* shadcn primitives — button, input, card, badge, dialog, toast, otp-input, skeleton, empty-state, error-state — plus non-shadcn shared components (Logo, StatusBadge, PremiumBadge). Apps can still install additional shadcn components locally via the CLI for one-offs.

**Why:** [[DESIGN#9. Component Library — Web|DESIGN.md §9]] specifies custom variants (7 button variants, branded badges, OTP input). Duplicating those across 3 Next.js apps is a maintenance trap. But shadcn's "you own the code" philosophy still matters for app-specific components.

**Alternatives considered:**
- **Classic shared package** (everything centralized) — too rigid for shadcn's copy-paste model.
- **Per-app registry** (shadcn CLI copies into each app) — duplicates the branded primitives.

---

### D4. Drop `packages/types` from the v1 layout

**Decision:** Do not create a shared types package. [[ONLYOU-SOURCE-OF-TRUTH#10. Monorepo & Domains|SOURCE-OF-TRUTH §10]] lists `packages/types` in the v1 monorepo structure — skip it.

**Why:** Convex auto-generates TypeScript types from `convex/schema.ts` and function signatures into `convex/_generated/api`. Client apps import types from there directly. A separate shared-types package is the pattern for tRPC/REST stacks where you need to hand-write types that the backend doesn't provide. With Convex, it creates a second place where types can drift.

**What replaces it:** `@onlyou/core/enums` holds the *string literal values* for roles, consultation statuses, subscription plans, etc. Both `convex/schema.ts` and client apps import from there — so Convex validators stay locked to the canonical enum list.

---

### D5. Rename `packages/tokens` → `packages/core`

**Decision:** The shared framework-agnostic package is called `@onlyou/core`, not `@onlyou/tokens`.

**Why:** It holds more than design tokens: also enums (§4 of [[ONLYOU-SOURCE-OF-TRUTH]]), feature flags (§16), formatters (`formatRupees`, `formatDate`, `formatSampleId`, `formatOrderId`). `core` is more accurate.

---

### D6. Convex at repo root; minimal schema

**Decision:** Convex lives at `/convex/` (not under `apps/`). Phase 1 schema contains only `users` (stub) and `featureFlags` (7 seeded flags, all `false`). Every other business table is deferred to the phase that needs it.

**Why:**
- **Root location:** Convex CLI and dashboard conventions expect the folder at repo root. Moving it fights the tool.
- **Minimal schema:** Building a Convex schema without the vertical-specific context we get in Phase 3 (Hair Loss) means designing fields we'd rewrite later. The 22 consultation statuses, the transition map, the privacy-boundary field selection — all of it needs brainstorming against real features, not pre-specified. Convex's "schema evolves as you build" model supports this; the migration cost of adding tables later is near-zero.

---

### D7. Auth deferred to Phase 2

**Decision:** `convex/auth.config.ts` is an empty placeholder in Phase 1. Convex Auth (with Gupshup phone OTP provider) is wired up in Phase 2.

**Why:** CLAUDE.md Phase 2 = "Patient app shell (all screens)" which *includes* the login screen. Auth is a screen, so it belongs in the phase that builds screens. Dragging it into Phase 1 bloats scope and couples us to Gupshup provider setup before we need it.

---

### D8. Aesthetic — "Clinical Luxe" (Option A)

**Decision:** [[DESIGN|DESIGN.md]] stays unchanged. The current "Clinical Luxe" direction (Playfair Display + Plus Jakarta Sans, warm off-white background, lavender accent, gold for premium) is locked.

**Why:** During the brainstorming session, a completely alternate direction was designed and shown side-by-side: "Apothecary Noir" (dark forest green + brass + Fraunces + Instrument Sans, square corners, rule lines, numbered sections — evoking an old apothecary shop). Founder compared both visually in the browser companion and chose Clinical Luxe. DESIGN.md is validated by comparison, not just by default.

**Note for future decisions:** If the founder ever wants to revisit the aesthetic, Apothecary Noir is a fully-specified fallback — the comparison HTML was preserved in `.superpowers/brainstorm/*/content/compare-options.html` during the session.

---

### D9. Definition of Done — "Design system provable"

**Decision:** Phase 1 is complete when every app has a `/design` showcase route that renders the full palette, typography scale, and component library. Founder must visually verify each app's showcase before Phase 2 begins.

**Why:** Non-technical founder approves visually. A `/design` route is the acceptance surface — cheaper than setting up Storybook, and it lives in the actual apps so we're testing the real production environment.

**Alternative considered:** Minimal "dev server boots + logo renders" — rejected as too shallow; doesn't prove the token pipeline actually works end-to-end.

---

### D10. Tooling discipline — zero lint/TS errors enforced on commit

**Decision:** Husky + lint-staged pre-commit hook runs `eslint --fix`, `prettier --write`, and `tsc --noEmit` on every commit. Commit is blocked on any failure. No `any`, no `@ts-ignore` (use `@ts-expect-error` with description).

**Why:** CLAUDE.md Rule #6 — "Zero lint or TypeScript errors. Fix them immediately — never leave them for later." A hook is the only way to actually enforce this; editor-only configuration lets errors accumulate.

---

## Open questions (resolved in writing-plans, not here)

1. Port numbers for landing/doctor/admin — confirm no local conflicts.
2. Existing `convex/_generated/` folder — delete and regenerate, or upgrade in place?
3. Existing root `.env.local` — must read before clobbering.
4. Existing root `package.json` (has a lone `convex` dep) — rewrite as workspace root.
5. Husky compatibility on Windows 11 + bash — verify hooks fire.

---

## References

- **Full spec:** [[superpowers/specs/2026-04-13-phase-1-scaffold-design]]
- **Project instructions:** [[../CLAUDE|CLAUDE.md]]
- **Tech stack canonical:** [[ONLYOU-SOURCE-OF-TRUTH#9. Tech Stack]]
- **Monorepo canonical:** [[ONLYOU-SOURCE-OF-TRUTH#10. Monorepo & Domains]]
- **Feature flags canonical:** [[ONLYOU-SOURCE-OF-TRUTH#16. Feature Flags (MVP)]]
- **Design system canonical:** [[DESIGN]]
