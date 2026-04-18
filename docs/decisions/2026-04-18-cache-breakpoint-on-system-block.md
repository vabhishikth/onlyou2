---
date: "2026-04-18"
phase: 2.5b
status: accepted
tags:
  - architecture
  - claude-api
  - prompt-caching
  - phase-2.5b
---

# Anthropic prompt cache breakpoint goes on the system prompt, not the last few-shot block

**Context:** Phase 2.5B Task 4 (`convex/lib/claude.ts`). The 2.5B design spec §2.5 specified prompt caching with a single `cache_control: { type: "ephemeral", ttl: "1h" }` breakpoint placed "after system prompt + 8 few-shot block, before the per-parse PDF." The plan (Task 4) implemented this by attaching `cache_control` to the last few-shot message block.

## Decision

Attach `cache_control` to the **system prompt block** instead of to the last few-shot block.

## Why

1. **Few-shot count can be zero in scaffolding / early execution.** Plan Task 4 ships with `FEW_SHOT_EXAMPLES = []` (populated later as real fixtures come online in Task 10+). If `cache_control` is on the last few-shot, an empty array yields zero cached blocks — the test assertion `cachedBlocks.length === 1` fails, and worse, the first 10 parses before few-shots are filled in run uncached.

2. **The system prompt is the most stable content.** It changes when the extraction JSON schema changes — rarely. Few-shot examples may be tuned quarterly as the curation backlog surfaces mis-extractions. Caching the most-stable block maximizes hit rate across the 1-hour TTL.

3. **Anthropic's caching semantics honor it.** `cache_control` on any content block marks everything BEFORE that block as cacheable. Placing it on the system block caches the system prompt itself; placing it on the last few-shot caches system + all few-shots. Both are valid. Option 1 is simpler and survives empty-few-shots gracefully.

4. **The PDF stays uncached correctly either way** because it's in a later user message, after the breakpoint.

## Consequences

- **`convex/lib/claude.ts`** attaches `cache_control` to the system prompt content block.
- **First-parse cost** is slightly higher than if few-shots were also cached (~30% more input tokens charged on the first parse of each hour). But marginal.
- **Steady-state savings** from the 1-hour TTL are unchanged: ~90% input-token reduction on cache hits across the system prompt.
- **Plan 2.5B's Task 4 spec text and test comment** updated from "cache on 8th few-shot" to "cache on system block." Future few-shot tuning (Task 10 fixtures, or quarterly advisor adjustments) does NOT require touching the cache layout.
- **Pattern for future AI integrations:** default to caching the system prompt. Cache additional blocks only if the system prompt is short AND there's a stable multi-KB example set that would benefit from its own breakpoint.

## References

- `convex/lib/claude.ts:callExtraction` — the reference implementation.
- [[superpowers/plans/2026-04-18-phase-2.5b-parse-pipeline]] Task 4 — original plan text.
- [[superpowers/specs/2026-04-18-phase-2.5b-parse-pipeline-design]] §2.5 — caching strategy.
- Anthropic docs: prompt caching semantics (verified 2026-04-18).
