# Phase 3C — skip-AI escape hatch reuses existing `AI_FAILED → AI_COMPLETE` edge

**Date:** 2026-04-25
**Phase:** 3C (AI pre-assessment, Option B)
**Spec:** `docs/superpowers/specs/2026-04-25-phase-3c-ai-pre-assessment-design.md`
**Status:** locked (design phase)

## Context

The Phase 3C spec needs a "skip-AI" terminal state for when Claude fails 3 attempts in a row. The case still has to reach the doctor — patient submitted a questionnaire, did the work; an AI outage cannot block care.

First-pass spec drafted a **new transition** `AI_FAILED → DOCTOR_REVIEW` and proposed adding an entry to the `systemTransitions` bypass list. That was wrong on two counts.

## What the spec self-review caught

1. **`DOCTOR_REVIEW` is not a real status.** The actual SOT enum routes post-AI to `ASSIGNED` (in queue) → `REVIEWING` (doctor opened). I had invented `DOCTOR_REVIEW` from naming intuition, not from the canonical graph.
2. **`AI_FAILED → AI_COMPLETE` already exists** in `validTransitions` at `convex/consultations/transitions.ts:24`. That edge has been there since Phase 3B's transition engine landed. Re-reading it during self-review made the intent obvious: this edge exists exactly so a system caller can mark the AI step "complete" with no assessment, dropping the case into the doctor queue at the same destination as a successful AI run.

## Decision

The skip-AI escape hatch in Phase 3C will fire `transitionStatus(AI_FAILED → AI_COMPLETE)` with `kind: "system"` and `reason: "ai-assessment-skipped-after-3-failures"`. **No new edge is added; no `systemTransitions` entry is added; `transitions.ts` is untouched.**

When the skip-AI path runs, NO `ai_assessments` row is written. Doctor portal (Phase 4) reads `ai_assessments` by `consultationId` via the `by_consultation` index and renders an empty state when absent.

## Why this is better

- **Zero schema churn.** Adding a state-machine edge that already does the right thing would have been performative work. The graph designer thought of this case.
- **Same downstream contract for happy path and skip path.** Doctor portal sees `status === "AI_COMPLETE"` either way. Empty-state branch is "row exists?" not "what status was it?" — simpler test surface.
- **No new doc to invent.** `DOCTOR_REVIEW` would have meant explaining what it was, why it differed from `ASSIGNED`/`REVIEWING`, and which screen it surfaced — all manufactured complexity.
- **Audit trail preserved.** `consultation_status_history` records the `AI_FAILED → AI_COMPLETE` edge with `kind: "system"` and the explicit reason string. Forensics still works.

## How this surfaced

Spec self-review per `superpowers:brainstorming` skill — "internal consistency: does the architecture match the feature descriptions?" Re-read of `convex/consultations/transitions.ts:23-25`. The fix touched 6 places in the spec; better to fix at design time than at planning time, and far better than at implementation time.

## Generalization

When designing in this codebase, **read the existing transition graph end-to-end before proposing new edges**. The graph is small (22 statuses, ~30 edges) and was authored deliberately. New edges should be the rare exception, not a reflex.

## Cross-references

- `docs/decisions/2026-04-24-phase-3-decomposition.md` — D7 locked the 22-status enum + transition validators in Phase 3B specifically to prevent schema migration drift across sub-phases. This decision is the first concrete payoff of D7.
- `docs/ONLYOU-SOURCE-OF-TRUTH.md` §3A — canonical transition graph.
- `convex/consultations/transitions.ts:23-25` — the edge in question.
