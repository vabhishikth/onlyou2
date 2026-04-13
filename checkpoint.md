# Checkpoint

**Current phase:** Phase 1 — Monorepo scaffold + Convex + design system
**Status:** ✅ COMPLETE — merged to master, founder visually approved

## Last session (2026-04-13)

Executed the full Phase 1 plan via subagent-driven development in a worktree
(`feature/phase-1-scaffold`), then merged to master. 12 commits covering
Phases A–K:

- **A** — Workspace root (pnpm 10.33.0, Turborepo 2.9.6, tsconfig base)
- **B** — `packages/config` (shared TS/ESLint flat/Prettier bases)
- **C** — `packages/core` (DESIGN.md tokens, 11 enums, 7 feature flags, IN formatters)
- **D** — `convex/` (users + featureFlags schema, auth placeholder)
- **E** — `packages/ui` (10 Tailwind 4 primitives + globals.css @theme block)
- **F/G/H** — `apps/{landing,doctor,admin}` (Next.js 16 + /design showcase, ports 3001/2/3)
- **I** — `apps/mobile` (Expo SDK 55 + NativeWind 4 + Playfair/Jakarta fonts)
- **J** — Husky + lint-staged pre-commit (blocks on lint/typecheck failure)
- **K** — Convex deployed to `aromatic-labrador-938`, 7 flags seeded, /design verified

All packages/apps typecheck clean. Founder visually verified landing's /design
route at localhost:3001 — all 10 sections rendered correctly (typography,
palette, buttons, inputs, badges, cards, dialog, skeleton, empty, error).

Two known cosmetic gaps (tracked for later phases, not Phase 1 scope):

- Cards look bare — full styling lands in Phase 3 (Hair Loss condition cards)
- Inputs are basic — floating labels + +91 prefix land in Phase 2 (patient forms)

## Next session

**Phase 2 — Patient app shell (all screens).** Approval gate after this phase.

Starts with a brainstorming session on the screen tree for the Expo patient app.
Read `docs/APP-PATIENT.md` + `docs/APP-PATIENT-CHANGES.md` first (the `-CHANGES`
companion overrides the base — payment-after-prescription redesign). Auth
(Convex Auth + Gupshup phone OTP) is wired up as part of Phase 2 since the
login screen is part of the shell.

Use `superpowers:brainstorming` skill with visual companion ON — the founder
approves visually. Mock up every screen in the browser before writing code.
