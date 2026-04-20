---
date: "2026-04-20"
phase: 2.5
status: decision
tags:
  - design-system
  - phase-2.5c
  - admin-portal
  - component-architecture
---

# Decision — Hybrid component ceiling (custom layout + shadcn mechanics, restyled)

**Date:** 2026-04-20
**Phase:** 2.5C brainstorm
**Status:** Approved by founder during Plan 2.5C brainstorm.
**Related:** [[2026-04-20-admin-token-register]], [[2026-04-20-admin-ui-wrapper-layer]]

## Decision

The admin portal UI in Plan 2.5C uses a **hybrid component ceiling**:

- **Custom layout + visual components** — ported from the Operator Desk prototype (`docs/design/admin/operator-desk/admin-*.jsx`). These carry the distinctive visual language: sidebar, header, workspace shell, right rail, KPI strip, queue table, card, filter pills, SLA chip (repurposed as status chip), amber-pill primary CTA, serif headings with italic accent words, micro-labels.
- **shadcn primitives for mechanics** — restyled in `operatorPalette` tokens via a single wrapper layer. Used for Dialog, Sheet, Combobox/Command, Toast (sonner), Form + Input + Select via `react-hook-form` + `zod`, Skeleton.

Every shadcn component is wrapped once in `apps/admin/src/components/ui/*` and the rest of the admin app imports only those wrappers. See [[2026-04-20-admin-ui-wrapper-layer]].

## Alternatives considered

1. **Port the prototype verbatim — zero shadcn.** Rejected. Rebuilding accessible primitives from scratch (Dialog focus traps, Combobox keyboard nav, Form error association, Select ARIA listboxes) is where accessibility bugs ship. Radix (shadcn's primitive layer) has already solved these. Prototype fidelity for visuals; Radix mechanics for a11y.

2. **Pure shadcn + light theming.** Rejected. The Operator Desk prototype has a specific visual identity (serif italic accent words, amber corner-glow on KPI cards, pulsing SLA dots, dashed separators, custom sidebar IA) that shadcn's default component shapes don't naturally express. Theming shadcn's defaults into this identity would be more work than porting the prototype's distinctive components as custom code.

3. **Full custom everything with an in-house a11y library.** Rejected. Multi-month work for zero product value. Every accessibility concern Radix solves would need a custom solution, tested, maintained.

## Why

- **Prototype's distinctive components deserve fidelity.** Sidebar + header + KPI strip + queue table + pipeline cards are where the Operator Desk aesthetic lives. Custom code matches the prototype within styling distance.
- **shadcn's mechanics are mature.** Dialog, Combobox, Form, Toast have been iterated on by many teams over many years. Rebuilding them forfeits that.
- **Linear restyling work.** Theming shadcn to `operatorPalette` is a wrapper file per primitive — linear cost. Rebuilding accessible Combobox is not linear — bugs ship over months.

## How to apply

1. **Custom components live in** `apps/admin/src/components/shell/*` (Sidebar, Header, Workspace, RightRail), `apps/admin/src/components/ops/*` (KPIStrip, QueueTable, PipelineCard, Card, FilterPills, SerifHeading, MicroLabel, SLAChip), and `apps/admin/src/components/buttons/*` (AmberPillButton, SecondaryLink).

2. **shadcn wrappers live in** `apps/admin/src/components/ui/*` — one file per primitive. Each wrapper imports the Radix primitive (or shadcn generated file), substitutes `operatorPalette` tokens, exports the themed component with identical API to shadcn's default. The admin app imports only from `@/components/ui/*`, never from shadcn's sources directly. See [[2026-04-20-admin-ui-wrapper-layer]] for the single-site invariant.

3. **Decision per new component:** "is this about the Operator Desk's visual voice?" → custom. "is this about focus, keyboard nav, ARIA, form state?" → wrapper over shadcn.

## Known risks

- **Leak risk.** An admin-app file accidentally imports shadcn directly, bypassing the wrapper layer. Mitigation: ESLint `no-restricted-imports` rule blocking direct shadcn imports outside `components/ui/*`. Locked in [[2026-04-20-admin-ui-wrapper-layer]].
- **Prototype drift.** The Operator Desk prototype will keep evolving (founder may iterate further). Custom components anchor against the current bundle (`docs/design/admin/operator-desk/`). Any future redesign is a code change, not a CSS theme swap.
- **shadcn upstream breaks** could land in wrappers. Pinning shadcn versions and treating upstream bumps as intentional upgrades (with visual regression check) is the usual hygiene.

## Reversibility

If the hybrid ceiling feels wrong, pivots:

- To full-custom: delete wrappers, build custom primitives. Multi-week cost.
- To full-shadcn: delete custom components, collapse into themed shadcn. Loses prototype fidelity.

Staying hybrid has the lowest ongoing cost.
