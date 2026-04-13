---
date: "2026-04-13"
phase: 1
status: complete
tags:
  - retro
  - phase-1
  - as-built
---

# Phase 1 — Completion Retro (As-Built)

**Date:** 2026-04-13
**Phase:** 1 of 8 (Monorepo scaffold + Convex + design system)
**Status:** ✅ Merged to master, founder visually approved at `localhost:3001/design`
**Plan:** [[superpowers/plans/2026-04-13-phase-1-scaffold]]
**Decisions:** [[2026-04-13-phase-1-stack-and-scaffold]]

Durable record of what actually shipped, so future phases don't have to re-derive it from git.

---

## As-built versions

| Thing                | Version / Value                                     |
| -------------------- | --------------------------------------------------- |
| pnpm                 | 10.33.0                                             |
| Turborepo            | 2.9.6                                               |
| Next.js              | 16 (landing, doctor, admin)                         |
| Tailwind CSS         | 4 (`@theme` block in `globals.css`)                 |
| Expo SDK             | 55                                                  |
| NativeWind           | 4                                                   |
| Convex deployment    | `aromatic-labrador-938`                             |
| Feature flags seeded | 7                                                   |
| Pre-commit           | Husky + lint-staged (blocks on lint/typecheck fail) |

## Port map

| App            | Port         |
| -------------- | ------------ |
| `apps/landing` | 3001         |
| `apps/doctor`  | 3002         |
| `apps/admin`   | 3003         |
| `apps/mobile`  | Expo default |

## Package layout

- `packages/config` — shared TS / ESLint flat / Prettier bases
- `packages/core` — DESIGN.md tokens, 11 enums, 7 feature flags, IN formatters
- `packages/ui` — 10 Tailwind 4 primitives (typography, palette, buttons, inputs, badges, cards, dialog, skeleton, empty, error)

## Convex schema (initial)

- `users` table
- `featureFlags` table (seeded with 7 flags)
- Auth placeholder (real Convex Auth + Gupshup OTP lands in Phase 2)

## Deferred cosmetic gaps (not Phase 1 scope)

- **Cards look bare** — full card styling lands in Phase 3 (Hair Loss condition cards)
- **Inputs are basic** — floating labels + `+91` prefix land in Phase 2 (patient forms)

## Verification

Founder visually verified landing's `/design` route at `localhost:3001`. All 10 primitive sections rendered correctly. All packages and apps typecheck clean.

## Next phase

**Phase 2 — Patient app shell.** Approval gate after completion. Auth (Convex Auth + Gupshup phone OTP) wires up as part of this phase since login is part of the shell. Read [[APP-PATIENT]] + [[APP-PATIENT-CHANGES]] first — the `-CHANGES` companion overrides the base (payment-after-prescription redesign).
