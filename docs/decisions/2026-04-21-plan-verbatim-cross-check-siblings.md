# Plan-verbatim code requires cross-checking siblings before shipping

**Date:** 2026-04-21
**Phase:** 2.5C Wave 4 (code review retrospective)
**Scope:** Subagent-driven development — how agents handle "use plan verbatim" instructions

## Context

Plan 2.5C ships ~35 tasks, many with verbatim test + implementation code the
controller hands directly to an implementer subagent. This accelerates execution
when the plan is accurate, but plan defects compound silently: a bug copied from
plan → two tasks → three call sites produces a multi-file correction.

Wave 4 surfaced three categories of defect in plan-verbatim code:

1. **Enum-casing defects** — plan's test seeds used `role: "patient"` /
   `"admin"` (lowercase) but the project's `ROLES` enum is uppercase.
   Caught by Task 22 implementer; propagated correction notes to Tasks 23, 24, 25.
2. **API-availability defects** — plan's test seeds used
   `ctx.db.system.insert("_storage", ...)` which is not a valid `convex-test`
   surface. Real convention is `ctx.storage.store(new Blob(...))`. Caught by
   Task 22 implementer.
3. **Cross-action drift** — plan's `reclassifyAllReports.ts` hardcoded
   `age: 30` in the `findReferenceRangeId` lookup, while the sibling
   `reclassifyForCanonicalId.ts` (Task 22, shipped one commit earlier)
   correctly used `user.dob ? computeAge(user.dob) : 0`. Plan-verbatim
   execution propagated the bug; only code review caught it. **Fix landed
   in `fcf4466`** with a pediatric-range regression test that failed cleanly
   under hand-revert.

## Decision

When dispatching implementer subagents with plan-verbatim code, the prompt
MUST instruct the agent to:

1. **Cross-check sibling actions / mutations for consistency** before
   shipping. If Task N implements an action that shares logic with an
   action shipped by Task M, read Task M's implementation and flag any
   divergence in how shared primitives (queries, helpers, `user`-derived
   fields, enum values) are used. Flag as `DONE_WITH_CONCERNS` and let
   the controller decide.

2. **Sanity-check API availability at plan-copy time.** For any API call
   the plan shows verbatim (`ctx.db.system.insert`, `ctx.scheduler.X`,
   etc.), verify the call exists in the current Convex / convex-test
   version. A quick grep of other tests in the repo for the same surface
   usually resolves this in 30 seconds.

3. **Cross-check enum literals against source-of-truth exports**
   (`packages/core/src/enums/*`) before inlining them in plan-verbatim
   seed blocks. The plan was written before the enum casing was
   finalized; ROLE/STATUS literals should be imported or at minimum
   checked against the enum constant.

Code review remains the last line of defense, but the cost of a
code-review round trip (≥ 3 subagent rounds: implementer → spec → code
review → fix → re-review) is 10×+ the cost of a 30-second pre-ship grep.
Controller prompts for Wave 5/6 should embed the cross-check instruction
inline.

## Update to subagent prompt template

Future implementer prompts for plan-verbatim tasks should include, after
the pre-verified-context block and before the plan-steps block:

```
## Pre-ship sanity checks (REQUIRED)

Before committing, run:

1. Cross-check sibling actions/mutations shipped by earlier tasks in this
   wave for consistency. If Task N-1 uses pattern X for a shared
   primitive (query, helper, user-derived field), Task N should use
   pattern X too — unless the plan explicitly calls out the divergence.
   Flag divergences as DONE_WITH_CONCERNS; do not silently propagate.

2. For every API call shown verbatim in the plan, grep the repo for the
   same surface. If the plan's API doesn't exist or isn't used anywhere
   else in the codebase, flag and ask — do not ship plan pseudocode.

3. For every enum/literal string in plan seed blocks, cross-check against
   `packages/core/src/enums/*`. If the plan's casing differs from the
   enum constant, trust the enum.

The three plan-defect categories from Wave 4 — enum casing, unavailable
APIs, and cross-action drift — are all catchable in <1 min with grep.
```

## Validation

- Task 22 implementer caught (1) and (2) without being told. The failure
  was that Task 23 agent was not instructed to cross-check Task 22's
  `age: user.dob ? computeAge(user.dob) : 0` pattern and silently
  shipped the plan's `age: 30` — a correctness bug.
- Adding the pre-ship sanity checks block to Wave 5/6 dispatches is the
  minimum cost-effective fix. It costs ~100 tokens per dispatch and
  catches an entire class of review-round-trip.

## References

- Plan: `docs/superpowers/plans/2026-04-20-phase-2.5c-ingestion-automation-reclassify.md`
- Age-bug fix: commit `fcf4466` (Task 23 follow-up)
- Audit-assertion-gap fix: commit `da357cb` (Task 24 follow-up)
- Skill: `superpowers:subagent-driven-development` (5.0.7)
