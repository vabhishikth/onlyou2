# Visual Direction — Adoption Decision

**Date:** 2026-04-14
**Status:** Decided (late Phase 2 brainstorm, post-spec)
**Scope:** Establishes `docs/VISUAL_DIRECTION.md` as the authoritative screen-pattern reference for all patient-facing UI, with five named carve-outs for Phase 2.

## Decision

Adopt `docs/VISUAL_DIRECTION.md` (modelled on Hims iOS, Jan 2025) as the authoritative source for screen-by-screen layouts, interaction recipes, floating-label input behavior, bottom-sheet patterns, empty/error/skeleton states, and the "Clinical Luxe" feel checklist. Treat it as a must-read alongside `docs/DESIGN.md` for every patient-facing screen.

Five sections are **not adopted** for Phase 2:

| Carve-out                                                 | What the doc says                                              | What Phase 2 does                                                           | Reason                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **§2.4 tab bar — 5 tabs**                                 | Home · Activity · Orders · Messages · Profile                  | **4 tabs + profile avatar top-right**: Home · Explore · Activity · Messages | Founder's explicit brainstorm call. See `2026-04-14-phase-2-navigation-ia.md`                        |
| **§2.9 Shop tab** (Featured / Browse / hero cards / grid) | First-class Shop tab                                           | Not in Phase 2 scope                                                        | onlyou ships medications as part of treatment subscriptions, not a standalone e-commerce catalog     |
| **§2.10 Cart screen** (line items / promo / checkout)     | First-class Cart tab                                           | Not in Phase 2 scope                                                        | Same — no cart concept in a subscription telehealth product                                          |
| **§2.5 Aadhaar ID Verification screen**                   | Last-4 digits + ID photo upload in consultation                | Not in Phase 2 scope                                                        | No existing vault doc specifies it; needs compliance + legal review before adoption                  |
| **§7 Haptics + §8 Reduce Motion + full a11y audit**       | Haptic feedback map + reduce-motion + VoiceOver + Dynamic Type | Deferred to Phase 8 (launch polish). Logged in `DEFERRED.md`                | More efficient to apply uniformly at polish time; touch-target ≥44px stays in Phase 2 as a base rule |

Everything else in VISUAL_DIRECTION.md is authoritative for Phase 2 and every phase after.

## Why

1. **Premium onboarding feel matters.** Founder's explicit emphasis: the shell has to look and feel like a premium consumer health app, not a scaffolding. A detailed pattern library that's been proven by Hims is a shortcut to that bar without re-inventing.
2. **Pattern library keeps implementation consistent.** Every screen looking coherent is what separates "shell" from "prototype." The feel checklist is a per-screen gate the implementer runs before marking a screen done.
3. **The critical rules bind us.** One question per screen, floating labels, bottom sheets for pickers, `accentWarm` consultation CTAs, 24px horizontal padding — these are now non-negotiable across every patient-facing screen.
4. **Carve-outs protect the brainstorm decisions.** We're not letting the imported doc silently overturn choices the founder already made. The five carve-outs are explicit, documented, and live at the top of VISUAL_DIRECTION.md where nobody can miss them.

## Consequences

### Phase 2 spec updates (applied 2026-04-14, commit alongside this decision)

- Added VISUAL_DIRECTION.md to the authoritative-sources list.
- Added a "Visual quality gate" section referencing the Clinical Luxe feel checklist.
- Added the `accentWarm` (#C4956B) CTA rule for all consultation-flow screens (welcome, phone, OTP, profile-setup, all questionnaire screens, treatment/plan-selection, treatment/payment, lab-booking).
- Profile stack sub-screens that are deferred (wallet, period-tracker, legal, help) now render placeholder components. Legal/Terms/Privacy/Telehealth Consent listed in §2.13 are all placeholders in Phase 2.

### CLAUDE.md updates

- New "DESIGN SYSTEM" section between Knowledge Base and Rules. Lists the required read order (DESIGN.md → VISUAL_DIRECTION.md), critical rules, and the carve-out callout.
- Paths corrected to our monorepo: `@onlyou/core/tokens/colors`, etc.

### DEFERRED.md

- No new deferrals — the carve-outs that would otherwise become deferrals (Shop, Cart, Aadhaar, haptics, a11y) are explicitly "not in scope" or already deferred (haptics, a11y were already in the Phase 2 mid-brainstorm additions section).

## Related

- [[VISUAL_DIRECTION|Visual Direction document]] — the file itself, with carve-out banner at the top
- [[2026-04-14-phase-2-navigation-ia|Phase 2 navigation IA]] — the source of the 4-tab decision
- [[2026-04-14-phase-2-fixture-and-auth-pattern|Fixture + auth pattern]]
- [[2026-04-14-phase-2-additions|Phase 2 mid-brainstorm additions]]
- `docs/DESIGN.md` — tokens + component source of truth
- `docs/DEFERRED.md` — running ledger
- `CLAUDE.md` — project rules (rules 1–10 + the new DESIGN SYSTEM section)
