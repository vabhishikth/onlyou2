---
date: "2026-04-17"
phase: 2.5
status: decision
tags:
  - design-system
  - phase-2.5
  - biomarker
---

# Decision — Two-register typographic system (Clinical Luxe + Biomarker Editorial)

**Date:** 2026-04-17
**Phase:** 2.5 brainstorm
**Status:** Approved by founder during Phase 2.5 brainstorm; documented in [[DESIGN]] top-of-file.

## Decision

The Onlyou patient app uses **two coexisting visual registers**, intentionally:

| Register                                  | Fonts                                   | Palette                                                                                              | Where                                                                                                                      |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Clinical Luxe** (existing, Phase 1+)    | Playfair Display, system sans           | `#141414` ink, `#C4956B` warm accent, lavender `#9B8EC4`                                             | Welcome, auth, profile, consultation flow, treatment flow, home tabs, activity tab (delivery), messages                    |
| **Biomarker Editorial** (new, Phase 2.5+) | Instrument Serif, JetBrains Mono, Inter | Warm parchment `#F6F1E9`, espresso `#1C1612`, copper amber `#B4641F`, sage `#5C6E4A`, rose `#A24636` | `apps/mobile/app/lab-results/**`, `apps/mobile/app/lab-booking/upload-results*`, `apps/mobile/src/components/biomarker/**` |

## Why

A lab report is a different kind of artifact than a chat or a treatment card. It should feel considered, document-like, reverent — less chatty than the rest of the app. The typographic shift (serif display + mono for data) and the warm-parchment surface carry that register. Collapsing everything into one system would flatten a clinically meaningful signal.

The founder iterated on the editorial aesthetic in Claude Design (claude.ai/design) and approved it standalone for the biomarker surface. See chat transcript archived in the source bundle at `onlyou2/chats/chat1.md` and key decisions captured in [[superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design|Phase 2.5 design spec]].

## How to apply

1. **Token enforcement.** `@onlyou/core/tokens/biomarker` exports `biomarkerPalette` + `biomarkerFonts`. `@onlyou/core/tokens/colors` (Clinical Luxe) stays as-is. Both re-exported from `@onlyou/core/tokens/index`.
2. **ESLint guardrail.** `no-restricted-imports` rule blocks importing `biomarkerPalette` outside the biomarker-surface paths listed above. Inverse rule blocks importing Clinical Luxe color tokens inside biomarker screens. Prevents accidental cross-pollination.
3. **New screens** inside a biomarker surface use the editorial palette by default. New screens outside biomarker use Clinical Luxe.
4. **Do not collapse or "fix" the inconsistency.** The register shift is intentional signalling. If a future contributor (or a later Claude Code session) sees the two systems and proposes to unify them, the answer is **no** — point them at this decision record.
5. **Dark mode** is defined in the tokens but not wired in 2.5. See [[DEFERRED]].

## Known risks

- **Drift risk.** Without the ESLint guardrail, one screen using the wrong tokens leads to five. Guardrail is load-bearing.
- **Cost of adding a third register** (if the founder later wants one for, say, the wellness content feed) is higher than starting with one. Accept this — the register count is currently two, and a third should require explicit decision-record approval.

## Reversibility

If the two-register system ever feels wrong on-device, we revisit in a dedicated "design-system unification" phase. The editorial palette is contained to the biomarker surface, so reverting means one directory + one tokens file, not a global retrofit. Cost of reversal: bounded.
