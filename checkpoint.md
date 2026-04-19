# Checkpoint

**Current phase:** Phase 2.5B — Parse pipeline **✅ MERGED to master `eaea3b7` on 2026-04-18**. 2.5A merged earlier same day (`042f660`). **Plan 2.5C (ingestion + curation + portal contracts) queued next.**
**Status:** Both 2.5A and 2.5B shipped to master. Both feature branches + worktrees cleaned up on 2026-04-19 (git state clean; orphan dirs on disk harmless).

**Post-merge fixes on master (2026-04-19):**

- `e9bb225` — workspace lint restored: `next lint` removed in Next.js 16 → swap to `eslint .`; /design swatches now import from `@onlyou/core/tokens/colors` (30 `onlyou/no-hardcoded-hex` errors resolved).
- `54ea1ad` — first live `pnpm test:claude` run surfaced `betas: Extra inputs are not permitted` from SDK ^0.90. Routed `callExtraction` through `client.beta.messages.create` (the supported surface for per-request beta features). Live test now calls `extractMarkersWithRetry` (production path) to exercise the 8192-token retry on multipage wellness panels. Timeout bumped to 180s. **8/8 live fixtures pass** (128s, ~$0.25 per full run).
- Decision note: `docs/decisions/2026-04-19-anthropic-sdk-beta-namespace.md`

**⚠️ Carry-forward items before prod:**

- ~~`pnpm test:claude` live suite has never been run~~ → **✅ RAN 2026-04-19, 8/8 pass**. First time with a real `ANTHROPIC_API_KEY`.
- Manual Convex dashboard E2E (Task 19 Step 2) — user has not yet run `admin:triggerParseForLabReport` against a fixture PDF from the dashboard UI.
- 45 reference-range rows remain `DRAFT — pending review`. Clinical advisor sign-off is a prerequisite before any prod seed.
- Rotate the dev `ANTHROPIC_API_KEY` after E2E completes — it was pasted into chat on 2026-04-19 and is in transcript/terminal history.

**2.5B artifacts on master:**

- Plan: `docs/superpowers/plans/2026-04-18-phase-2.5b-parse-pipeline.md` (commit `a9fe4f2`)
- Spec: `docs/superpowers/specs/2026-04-18-phase-2.5b-parse-pipeline-design.md` (commit `5642dab`)
- Review: `docs/superpowers/reviews/2026-04-18-phase-2.5b-parse-pipeline-review.md`
- As-built retro: `docs/decisions/2026-04-18-phase-2.5b-as-built.md`

**2.5B commits on branch (27 total):**

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
| 16  | 28-scenario mocked-Claude branch-coverage test suite                                                 | `cc974ab` |
| 17  | `pnpm test:claude` live integration suite — 8 synthetic fixtures                                     | `8687bd3` |
| 18  | Conditional CI gate for `test:claude` when API key present                                           | `4f5fc2c` |
| 19  | First-pass code review report                                                                        | `d754633` |
| 20  | Review fix C-1: 400 terminal + alert:p1                                                              | `970a67d` |
| 21  | Review fix I-1: atomic cron lock-claim prevents double-fire                                          | `be92a30` |
| 22  | Review fix I-2: refusal detection false-positive on valid JSON                                       | `534e01a` |
| 23  | Review fix I-3: defer few-shot examples to 2.5C with ledger entry                                    | `689401a` |
| 24  | Review fix M-1: zod-retry re-throws network errors instead of wrapping                               | `cc50ce9` |
| 25  | Review fix M-3: dedupe computeAge — export from classifyRow                                          | `5da104d` |
| 26  | Review fix M-4: status guard on parseLabReport entry                                                 | `94feec9` |

**Decisions logged mid-execution (committed to master):**

- `docs/decisions/2026-04-18-cache-breakpoint-on-system-block.md` — `cache_control` placement rationale (`3bbfe40` on master)
- `docs/decisions/2026-04-18-telemetry-hash-pure-js.md` — Convex V8 bundler forced pure-JS FNV-1a hash over `node:crypto` SHA-256 (`d088a4b` on master)
- `docs/decisions/2026-04-19-anthropic-sdk-beta-namespace.md` — `betas` body param only valid on `client.beta.messages.create`; regular `messages.create` rejects it (`54ea1ad` on master)

## Test counts at acceptance (refreshed 2026-04-19)

- `pnpm test:convex` — **112 passed** (13 suites; mocked Anthropic SDK exposes both `messages.create` and `beta.messages.create` via same spy)
- `pnpm test:seed` — **19 passed**
- `pnpm test:claude` (live Anthropic API) — **✅ 8/8 passed** on first real run (2026-04-19, 128s duration, Sonnet 4.6 vision). Surfaced and fixed two real issues: SDK beta-namespace routing + multipage wellness `max_tokens` retry exercise.
- `pnpm --filter @onlyou/mobile test` — **150/150 passed** (44 suites; prior flake did not fire on re-run)
- `pnpm -w typecheck` — clean across 6 packages
- `pnpm -w lint` — clean across 6 packages (admin/doctor/landing lint now invokes `eslint .` directly)

## Next steps

1. **Manual Convex dashboard E2E** (carry-forward from Task 19 Step 2) — trigger `admin:triggerParseForLabReport` on a fixture PDF from the Convex dashboard; verify `biomarker_reports` + `biomarker_values` rows appear. `ANTHROPIC_API_KEY` is already set on dev Convex deployment (confirmed 2026-04-19).
2. **Brainstorm Plan 2.5C** (ingestion + curation + portal contracts).
3. **Push master to `origin/master`** — 3 commits ahead as of 2026-04-19 (`2f594fc`, `e9bb225`, `54ea1ad`).

## Branch + worktree

- Master tip: `54ea1ad` (2026-04-19 SDK beta-namespace fix)
- Phase 2.5A + 2.5B branches: merged + deleted (local + remote)
- Worktrees: both unregistered from git on 2026-04-19. Physical dirs `D:/onlyou2-phase-2.5a` and `D:/onlyou2-phase-2.5b` may still exist on disk (Windows file locks held by Metro/editors at cleanup time); safe to `rm -rf` after closing processes.

## Untracked / gitignored files (leave alone)

- `apps/mobile/.env.local` — `EXPO_PUBLIC_CONVEX_URL=https://aromatic-labrador-938.convex.cloud`. Gitignored; must exist on any machine running the app.
- Root `.env.local` — copied into worktree during Task 1 for `CONVEX_DEPLOYMENT` env; gitignored.
- `convex/_generated/*` — auto-generated by `npx convex dev`.

## Prior context (still valid)

- **Plan 2.5 split:** 2.5A foundation (complete), 2.5B parse pipeline (this phase — complete), 2.5C ingestion/admin, 2.5D mobile UI. Only 2.5D triggers the Phase 2.5 approval gate.
- **45 rows are DRAFT.** Every row has `clinicalReviewer: "DRAFT — pending review"` and `reviewedAt: null`. Clinical advisor sign-off is a **Phase 2.5 prerequisite** before any prod Convex seed.
- **`parseLabReport` is registered as `api.*`** (public) in 2.5B for dashboard testing. Will be converted to `internal.*` in 2.5C when `intakeUpload` wraps it.
- **`FEW_SHOT_EXAMPLES` is an empty array** in the system prompt for 2.5B. Populating it with 8 format-specific examples is deferred to 2.5C.

## 2.5A completion (prior context)

- As-built retro: `docs/decisions/2026-04-18-phase-2.5a-as-built.md`
- Plan: `docs/superpowers/plans/2026-04-18-phase-2.5a-foundation.md`
- Spec: `docs/superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design.md`
- Review: `docs/superpowers/reviews/2026-04-18-phase-2.5a-foundation-review.md`
