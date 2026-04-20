---
date: "2026-04-20"
phase: 2.5
status: decision
tags:
  - design-system
  - phase-2.5c
  - admin-portal
---

# Decision — Third design-token register `operatorPalette` (Operator Desk)

**Date:** 2026-04-20
**Phase:** 2.5C brainstorm
**Status:** Approved by founder during Plan 2.5C brainstorm.
**Source bundle:** `docs/design/admin/operator-desk/`

## Decision

The admin portal adopts the **Operator Desk** design direction (from the 2026-04-20 Claude Design bundle) as a distinct third design-token register, alongside Clinical Luxe (patient app consultation flows) and Biomarker Editorial (patient app biomarker surface).

`@onlyou/core/src/tokens/operator.ts` exports `operatorPalette`:

- Warm-sandy canvas (`page #E8DCC5`, `shell #F4EDE3`, card tints `#FBF6EC` / `#F0E7D5` / `#E6DCC5`)
- Dark-ink sidebar (`#1C1612`) with bone (`#F4ECE1`) text
- Copper-amber primary (`#B4641F`) + honey secondary (`#B57A2F`)
- Semantic severity: green `#4E7A4A` (ok) / rose `#A24636` (breach)

Fonts reuse the Biomarker Editorial trio — Instrument Serif, Inter, JetBrains Mono — but are a semantically distinct register (different boundary, different palette, different layout language).

## Alternatives considered

1. **Merge into Biomarker Editorial as a single "warm register"** — rejected. The palettes diverge meaningfully: Biomarker uses `#EFE5D4 / #F6F1E9 / #EFE8DC / #E7DFD0 / #DDD3C0`; Operator uses `#E8DCC5 / #F4EDE3 / #FBF6EC / #F0E7D5 / #E6DCC5`. The dark-ink sidebar and amber-primary CTA have no equivalent in the biomarker surface. A single merged register would end up as two namespaced sub-objects (`biomarker.*` and `admin.*`) with all the cost of two registers and none of the guardrail clarity.

2. **Collapse Operator into Clinical Luxe** — rejected. Clinical Luxe is a patient-facing consumer aesthetic (Playfair Display, near-black ink, warm accent). Operator is a dense command-center aesthetic. Different type system, different information density, different layout primitives.

3. **Skip the register and use shadcn defaults with light theming** — rejected (this was the earlier 2.5C direction before the design bundle arrived). Would mean rebuilding the whole admin surface in Phase 5 when the real design lands. Wasted work.

## Why

A command center for ops is a fundamentally different artifact from a patient's health record. Different density (dense KPIs + pipelines vs spacious cards), different information pace (live-updating ops data vs frozen reports), different primary CTA intent (take action on a backlog vs reflect on your values). The token shift carries the register.

Matches the existing two-register pattern already approved in [[2026-04-17-biomarker-design-register]] — same rule applies: intentional signalling, not drift to clean up.

## How to apply

1. **Token file.** `packages/core/src/tokens/operator.ts` exports `operatorPalette` (and `operatorShadows`, `operatorLineScale`, `operatorRadiusScale` as needed). Re-exported from `@onlyou/core/tokens/index`.
2. **Shared primitives.** Extract a `packages/core/src/tokens/warm-primitives.ts` for things both Biomarker Editorial and Operator should share verbatim — the Instrument Serif / Inter / JetBrains Mono font loader, any alpha-ink line values that match byte-for-byte, shadow recipes if identical. Both registers import from `warm-primitives.ts`. Don't duplicate; don't merge.
3. **ESLint guardrail.** `no-restricted-imports` rule: `operatorPalette` importable only from `apps/admin/**`. Inverse rule: `biomarkerPalette` and Clinical Luxe color tokens NOT importable from `apps/admin/**`. Matches the biomarker register's existing guardrail from [[2026-04-17-biomarker-design-register]].
4. **New admin screens** default to `operatorPalette`. Other surfaces are walled off by ESLint.
5. **Dark mode.** `night-styles.css` in the bundle (Night Desk alternate — Space Grotesk + charcoal + neon lime) is parked. Not part of this register. See [[DEFERRED]] Phase 5 entry.

## Known risks

- **Third-register drift.** Each new register doubles the guardrail surface area. Before adding a fourth register (e.g., patient wellness feed), require an explicit decision record.
- **Shared-primitives extraction can regress.** If a value in `warm-primitives.ts` changes to serve one register, the other silently picks up the change. Mitigation: comment each primitive with "shared by: Biomarker Editorial + Operator" — touching it requires checking both.
- **Register collision in Phase 5** when the admin portal expands to non-biomarker surfaces (doctor onboarding, partner management, revenue). The Operator register extends — no new register expected. If one is proposed, require a decision record.

## Reversibility

If Operator ever feels wrong against Biomarker Editorial, revert is bounded: one token file + the admin app's imports. Cost of reversal: low. But "reverting" to a unified warm register would still require the two-register namespacing work, so the actual cheapest reversal is "leave Operator where it is."
