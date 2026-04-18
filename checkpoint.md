# Checkpoint

**Current phase:** Phase 2.5B — Parse pipeline **IN PROGRESS** on `feature/phase-2.5b-parse-pipeline` at `D:/onlyou2-phase-2.5b`. (2.5A merged to master `042f660` on 2026-04-18.)
**Status:** 🟡 Subagent-driven execution underway. **Tasks 1–15 of 22 complete** — all production code for the parse pipeline is written. Dispatching Task 16 (branch-coverage tests with mocked Claude, 16 scenarios, 100% coverage target) next. 55+ new unit tests on branch; all green; `parseLabReport`, `retryStuckParses`, and `triggerParseForLabReport` all registered on dev Convex.

**2.5B artifacts on master:**

- Plan: `docs/superpowers/plans/2026-04-18-phase-2.5b-parse-pipeline.md` (commit `a9fe4f2`)
- Spec: `docs/superpowers/specs/2026-04-18-phase-2.5b-parse-pipeline-design.md` (commit `5642dab`)

**2.5B commits on branch so far:**

| #   | Task                                                                                                 | Commit    |
| --- | ---------------------------------------------------------------------------------------------------- | --------- |
| 0   | Worktree scaffold                                                                                    | `ddc7e3f` |
| 1   | Schema widen (retry fields + `not_a_lab_report` status + `by_next_retry` index)                      | `bbb00f5` |
| 2   | Deps: `@anthropic-ai/sdk ^0.90.0`, `zod ^4.3.6`, `pdf-lib ^1.17.1` (dev), `puppeteer ^24.41.0` (dev) | `ba8eba7` |
| 3   | `convex/lib/telemetry.ts` — `hashUserId` + `logParseEvent` (structured logs, no PHI)                 | `ca5d2ce` |
| 4   | `convex/lib/claude.ts` — real SDK calls, Sonnet 4.6 model IDs, cache on system block                 | `b34489d` |
| 5   | `normalizeUnit` pure fn — numeric parse + factor conversion + qualitative + `<`/`>` qualifiers       | `9018868` |
| 6   | `matchPatientName` — honorifics + initials + reversed order                                          | `871f53d` |
| 7   | `classifyRow` — pregnancy-first guard → profile → range → unit → status                              | `d130a8a` |
| 8   | `retryScheduler` — per-class backoff (30s/2m/5m/15m + 429 `retry-after`), 30-min cap                 | `5dd7ddc` |
| 9   | `upsertCurationRow` internal mutation — normalizedKey dedup + occurrence counter                     | `fe68948` |
| 10  | 8 synthetic fixture PDFs + generator script + 3 golden JSONs                                         | `c6fb337` |
| 11  | `extractMarkersWithRetry` — zod + max_tokens + refusal in-process retries                            | `4c9f009` |
| 12  | `generateNarrativeWithGuard` — empty-markers fallback                                                | `a866308` |
| 13  | `parseLabReport` orchestrator action + 7 internal queries + 9 internal mutations                     | `2c748bb` |
| 14  | `crons.ts` — 2-min retry cron with stale-lock release                                                | `7785dbc` |
| 15  | `convex/admin.ts` — `triggerParseForLabReport` dev-only mutation                                     | `32561fe` |

**Decisions logged mid-execution:**

- `docs/decisions/2026-04-18-cache-breakpoint-on-system-block.md` — `cache_control` placement rationale (`3bbfe40` on master)
- `docs/decisions/2026-04-18-telemetry-hash-pure-js.md` — Convex V8 bundler forced pure-JS FNV-1a hash over `node:crypto` SHA-256 (`d088a4b` on master)

**2.5A completion (prior context):**

- As-built retro: `docs/decisions/2026-04-18-phase-2.5a-as-built.md`
- Plan: `docs/superpowers/plans/2026-04-18-phase-2.5a-foundation.md`
- Spec: `docs/superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design.md`
- Review: `docs/superpowers/reviews/2026-04-18-phase-2.5a-foundation-review.md`

## What shipped on the 2.5A branch (21 commits)

| #   | Task                                            | Commit                                  |
| --- | ----------------------------------------------- | --------------------------------------- |
| 0   | Worktree scaffold                               | `018ea0d`                               |
| 1   | Schema: pregnancyStatus + 8 biomarker tables    | `78f9439`                               |
| 2   | Feature flag `BIOMARKER_PARSING_ENABLED`        | `4a76cb2`                               |
| 3   | `convex/lib/claude.ts` fail-loud stubs          | `68aae8c`                               |
| 4   | `convex/admin.ts` dev-only scaffold             | `6be6b69`                               |
| 5   | Biomarker token module (palette + fonts)        | `a87ecea`                               |
| 6   | ESLint two-register guardrails                  | `0f96c1b`                               |
| 7   | 4 font TTFs + loader                            | `8288ea7`                               |
| 8   | Temp playground screen                          | `039b527`                               |
| 9   | biomarker-ranges.json tranches 1–4              | `481cce5` `bd79b41` `f8b7196` `e679b63` |
| 10  | unit-conversions.json                           | `ac5538b`                               |
| 11  | Internal `upsertRanges` mutation                | `8042cd7`                               |
| 12  | Seeder script + `ALLOW_UNREVIEWED_RANGES` guard | `8017ba2`                               |
| 13  | `seed-validation.test.ts` (19 assertions)       | `5bd1ac4`                               |
| 14  | `pnpm test:seed` CI wiring                      | `b1eede8`                               |
| 17  | Remove playground + ESLint permit-list          | `69f30a7`                               |
| 18  | First-pass review report                        | `9d5a907`                               |
| 19  | Review fixes (I-1, M-1, M-2, M-3)               | `434a5a5`                               |

## Test counts at acceptance

- `pnpm --filter @onlyou/mobile test` — **150 passed** (44 suites, Phase 2C baseline preserved)
- `pnpm test:convex` — **29 passed** (10 + 19 new seed-validation)
- `pnpm test:seed` — **19 passed**
- `pnpm -w typecheck` — clean across 6 packages
- `pnpm -w lint` — only pre-existing next.js app failures in admin/doctor/landing (unchanged from master)
- Seeder idempotency — verified: `inserted=0 updated=45 total=45` on re-run
- Convex dev deployment `aromatic-labrador-938` has 45 rows in `biomarker_reference_ranges`

## Next steps

1. **Rebase + push** `feature/phase-2.5a-foundation`; open PR.
2. **Merge** `feature/phase-2.5a-foundation` → `master` (title: `phase 2.5a — biomarker foundation (tokens + schema + seed)`).
3. **Phase 2.5A completes.** Brainstorm Plan 2.5B (parse pipeline — Claude Vision intake + classification).

## Branch + worktree

- Master tip: `54a7653` (Phase 2C merge) + plan/spec commits
- Phase 2.5A branch: `feature/phase-2.5a-foundation`
- Worktree: `D:/onlyou2-phase-2.5a`
- Commits ahead of master: **22** (after retro commit)

## Untracked / gitignored files (leave alone)

- `apps/mobile/.env.local` — `EXPO_PUBLIC_CONVEX_URL=https://aromatic-labrador-938.convex.cloud`. Gitignored; must exist on any machine running the app.
- Root `.env.local` — copied into worktree during Task 1 for `CONVEX_DEPLOYMENT` env; gitignored.
- `convex/_generated/*` — auto-generated by `npx convex dev`.

## Prior context (still valid)

- **Plan 2.5 split:** 2.5A foundation (this phase), 2.5B parse pipeline, 2.5C ingestion/admin, 2.5D mobile UI. 2.5A ships no user-facing surface.
- **45 rows are DRAFT.** Every row has `clinicalReviewer: "DRAFT — pending review"` and `reviewedAt: null`. Clinical advisor sign-off is a **Phase 2.5 prerequisite** before any prod Convex seed.
- **Seeder bypass path:** uses `spawnSync` of Convex CLI bundle (not `ConvexHttpClient`) — internal mutations not reachable over HTTP by design.
