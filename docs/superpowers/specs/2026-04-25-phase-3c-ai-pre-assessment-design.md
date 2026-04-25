# Phase 3C — AI Pre-Assessment (Option B)

**Status:** Design approved 2026-04-25. Ready for planning.
**Prerequisite:** Phase 3B merged (`c77bdd8`).
**Decision register:** `docs/decisions/2026-04-24-phase-3-decomposition.md` D2 (Option B locked, Option C deferred to Phase 8).
**DEFERRED reference:** line 297 — "AI pre-assessment upgrade B → C".

---

## 1. Goal

Replace the Phase 3B placeholder `convex/consultations/aiStub.ts` with a real Claude (Sonnet 4.6) action that reads questionnaire responses and produces a structured pre-assessment for the doctor. Patient sees a brief "reviewing your responses" screen with an AI-disclosure line and never sees raw AI output. Doctor portal (Phase 4) consumes the structured output.

**Patient-visible behavior unchanged from 3B except:** disclosure copy on the AI-processing screen, and a 3-attempt silent retry → graceful skip-to-doctor terminal that prevents the patient from ever seeing an error state.

## 2. Scope

**In scope:**

1. New `ai_assessments` Convex table, 1:1 latest-only with `consultations`.
2. New `convex/consultations/aiAssessment.ts` orchestrator action — replaces `aiStub.ts`.
3. New zod schema + flag-code vocabulary at `convex/consultations/aiAssessmentSchema.ts`.
4. Hair-loss prompt builder at `convex/consultations/prompts/hairLoss.ts` — system prompt cached via `cache_control`, user message contains questionnaire answers.
5. Retry policy: 3 attempts with backoff (30s / 2m / 5m), each retry overwrites `ai_assessments` row by `consultationId`.
6. Skip-AI escape hatch after 3rd failure: reuse the existing `AI_FAILED → AI_COMPLETE` edge (already in `validTransitions`) with `kind: "system"`. Case enters doctor queue with no `ai_assessments` row. No transition-graph change required.
7. AI-disclosure copy on patient `/treatment/ai-processing` screen (or wherever 3B routes the AI_PROCESSING state) — single line, ~16sp, secondary color.
8. Mocked-Claude vitest suite — branch coverage on retry, zod failure, refusal, terminal-skip, transition assertions.
9. 3-fixture live-API smoke under `pnpm test:claude:ai` — male AGA, female AGA, scarring red-flag case.
10. Telemetry: `logAiAssessmentEvent` (new helper in `convex/lib/telemetry.ts`) — start, success, failure, terminal-skip events. No PHI in logs.
11. Cost logging: per-call `tokensInput`, `tokensOutput`, `tokensCacheRead`, `costPaisa` written to row + telemetry.
12. Prompt versioning: `promptVersion: "hair-loss-v1"` stamped on every row. Bump to invalidate live-suite goldens.

**Out of scope (explicitly deferred):**

- Photo-based vision analysis (Option C) → Phase 8 / DEFERRED line 297. Forward-compat fields ship in 3C schema.
- Doctor-portal rendering of AI output → Phase 4.
- Patient-facing display of AI output → never (clinical-safety decision 2026-04-25, see §3.2).
- Per-vertical assessment (ED, PE, Weight, PCOS) → respective vertical phases. 3C wires hair-loss only; orchestrator is vertical-pluggable.
- Few-shot example library → 3C ships zero-shot for hair-loss. Population deferred unless live smoke surfaces drift.
- Real cost monitoring dashboard / budget alerts → Phase 8. 3C writes `costPaisa` per row; reading them comes later.

## 3. Architecture

### 3.1 Action chain

```
submitConsultation (3B)
  └── ctx.scheduler.runAfter(0, internal.consultations.aiAssessment.kickoff, { consultationId })

internal.consultations.aiAssessment.kickoff (action, attempt = 1)
  ├── getConsultation + getQuestionnaireResponses (internalQuery)
  ├── transitionStatus SUBMITTED → AI_PROCESSING (kind: "system", reason: "ai-assessment-start")  // already in validTransitions; same path 3B used
  ├── buildHairLossPrompt(questionnaire) → { system, user }
  ├── client.beta.messages.create({ model: "claude-sonnet-4-6", max_tokens: 2048, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: user }] })
  ├── parseResponse → zod validate → { narrative, stage, flags, confidence }
  ├── on success:
  │     ├── upsertAssessment (internalMutation) — overwrite or insert by consultationId
  │     ├── transitionStatus AI_PROCESSING → AI_COMPLETE (kind: "system", reason: "ai-assessment-complete")
  │     └── logAiAssessmentEvent("success", { consultationId, attempt, durationMs, tokens, costPaisa })
  └── on failure (timeout / 5xx / refusal / zod-fail):
        ├── transitionStatus AI_PROCESSING → AI_FAILED (kind: "system", reason: failureClass)
        ├── logAiAssessmentEvent("failure", { consultationId, attempt, failureClass, errorMessage })
        ├── if attempt < 3:
        │     └── ctx.scheduler.runAfter(backoffMs(attempt), internal.consultations.aiAssessment.retry, { consultationId, attempt: attempt + 1 })
        └── if attempt === 3:
              ├── transitionStatus AI_FAILED → AI_COMPLETE (kind: "system", reason: "ai-assessment-skipped-after-3-failures")  // already in validTransitions
              └── logAiAssessmentEvent("terminal_skip", { consultationId, totalAttempts: 3 })

internal.consultations.aiAssessment.retry (action)
  ├── transitionStatus AI_FAILED → AI_PROCESSING (kind: "system", reason: "ai-assessment-retry")  // already in validTransitions
  └── delegates to same handler as kickoff (shared core fn) with attempt argument
```

**Backoff schedule:** `attempt 1 → 30_000ms`, `attempt 2 → 120_000ms`, `attempt 3 → 300_000ms`. Total worst-case wait ~7.5 min. Patient screen shows the same copy throughout.

### 3.2 Why patient never sees AI output

Clinical-safety call (2026-04-25). Showing AI output (e.g. "Norwood IV", flag codes) before doctor review:

- creates anxiety on a stigmatized condition;
- exposes uncorroborated AI judgment as if it were diagnosis;
- is regulatory grey area in Indian healthcare;
- Hims / Ro / Numan / equivalent Western telehealth: none expose AI output to patient.

Patient transparency is preserved via disclosure copy on the processing screen (§3.5) and in the privacy policy (Phase 8). Doctor's plan, surfaced in Phase 4, is the patient-facing contract.

### 3.3 Failure classes

| Class             | Detection                                                              | Retry? | Notes                                                                                                      |
| ----------------- | ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `network_timeout` | SDK throws after 60s hard timeout on `messages.create`                 | yes    | Convex action timeout is 10 min; safe to retry within a single invocation                                  |
| `rate_limit`      | SDK 429; honor `retry-after` header up to backoff floor                | yes    | 2.5B pattern reused                                                                                        |
| `server_error`    | SDK 5xx                                                                | yes    |                                                                                                            |
| `refusal`         | Response `stop_reason === "refusal"` OR text matches refusal heuristic | yes    | Reused refusal regex from 2.5B                                                                             |
| `zod_validation`  | JSON parses but fails zod schema                                       | yes    | One in-process retry with stricter "respond with JSON only" reminder before bouncing to next attempt       |
| `parse_error`     | Response not valid JSON                                                | yes    | Same in-process retry                                                                                      |
| `client_error`    | SDK 400 / 401 / 403 / unknown 4xx                                      | no     | Skip-AI immediately — `transitionStatus` AI_FAILED → AI_COMPLETE (kind: "system"), skip remaining attempts |

`client_error` is the only non-retried class. Anything looking like a config bug (bad key, malformed prompt) shouldn't burn 3 attempts.

### 3.4 Prompt structure

**System prompt** (cached via `cache_control: { type: "ephemeral" }` on the system content block — same pattern as 2.5B parse pipeline, ref `docs/decisions/2026-04-18-cache-breakpoint-on-system-block.md`):

- Role: "You are a clinical assistant supporting a licensed doctor reviewing a hair-loss telehealth case."
- Output contract: strict JSON matching the zod schema.
- Stage classification rules: Norwood I–VII (with IIa/IIIa/IIIv variants) for male, Ludwig I–III for female, `unclassified` for ambiguous patterns (alopecia areata, scarring, telogen effluvium suspected). Map to `stage.scale` accordingly.
- Flag-code vocabulary: 12 codes listed in §4.3, each with severity + when to emit + when NOT to emit.
- Confidence calibration: 0.0–1.0 scale, with anchors (0.9 = unambiguous, 0.5 = mixed signals, 0.2 = should defer to doctor).
- Forbidden behaviors: addressing patient directly, giving treatment recommendations, mentioning prescription drugs by brand name, diagnosis disclosure language.
- Refusal handling: if questionnaire is malformed or empty, emit `confidence: 0.0`, `stage.scale: "unclassified"`, single flag `INSUFFICIENT_DATA` (info severity), narrative explaining what's missing.

**User prompt** (per-call, not cached):

- Patient demographics: age, sex, age-of-onset, family-history.
- Full questionnaire answers in section order (subjective + clinical + lifestyle), with question text + answer text.
- Reachability filter applied — only questions the patient saw based on skip rules and sex gate. Hidden questions omitted.
- No PHI beyond what was provided.

**Estimated token budget per call:**

- System prompt (cached after warm): ~3500 input tokens, ~10% read cost after first request in cache window.
- User prompt: ~1500 input tokens (28-Q max).
- Output: 800–1500 tokens typical, capped at 2048.
- Cost per warm call: ~₹0.40–₹1.00 ($0.005–$0.012).
- Cost per cold call: ~₹1.20–₹1.80 ($0.015–$0.022).

### 3.5 Patient screen — disclosure copy

Existing 3B AI-processing screen (`apps/mobile/app/treatment/ai-processing.tsx` or equivalent — verify in plan phase) gets:

- New copy block below primary headline:
  > "We use an AI assistant to prepare your case so your doctor can focus on what matters most. All medical decisions are made by your doctor."
- Token: `colors.textSecondary`, `typography.caption`, `spacing.horizontal` padding, `marginTop: spacing.sm`.
- No interaction (informational only). Not a checkbox.

No copy change on success ("Your case is ready for the doctor") or on terminal-skip (same copy — patient never knows AI was skipped).

## 4. Data model

### 4.1 New table — `ai_assessments`

```ts
ai_assessments: defineTable({
  consultationId: v.id("consultations"),

  // Provenance
  model: v.string(), // "claude-sonnet-4-6"
  promptVersion: v.string(), // "hair-loss-v1"
  attempt: v.number(), // 1..3 — which retry produced this row

  // Option B output
  narrative: v.string(),
  stage: v.object({
    scale: v.union(
      v.literal("norwood"),
      v.literal("ludwig"),
      v.literal("unclassified"),
    ),
    value: v.string(), // "III" | "IIIa" | "II" | "non-AGA suspected" | "alopecia areata suspect"
    confidence: v.number(),
  }),
  flags: v.array(
    v.object({
      code: v.string(), // see §4.3 vocab
      severity: v.union(
        v.literal("info"),
        v.literal("caution"),
        v.literal("red_flag"),
      ),
      message: v.string(),
    }),
  ),
  confidence: v.number(), // overall, 0..1

  // Option C forward-compat (always undefined in 3C; schema-ready for Phase 8)
  photoAnalysis: v.optional(v.string()),
  recommendedTemplateHint: v.optional(v.string()),
  redFlags: v.optional(v.array(v.string())),

  // Cost telemetry
  tokensInput: v.number(),
  tokensOutput: v.number(),
  tokensCacheRead: v.number(),
  costPaisa: v.number(),
  durationMs: v.number(),

  createdAt: v.number(),
}).index("by_consultation", ["consultationId"]);
```

**Upsert pattern:** retry attempts overwrite existing row by `consultationId` (1:1 latest-only). Failed attempts logged via `logAiAssessmentEvent` telemetry only — no DB row for failed attempts.

### 4.2 Transition graph delta

**No change to `convex/consultations/transitions.ts`.** All four transitions 3C uses are already in `validTransitions`:

| Edge                          | Trigger                       | Caller                              |
| ----------------------------- | ----------------------------- | ----------------------------------- |
| `SUBMITTED → AI_PROCESSING`   | kickoff, attempt = 1          | `transitionStatus` (kind: "system") |
| `AI_PROCESSING → AI_COMPLETE` | Claude succeeds               | `transitionStatus` (kind: "system") |
| `AI_PROCESSING → AI_FAILED`   | Any failure class             | `transitionStatus` (kind: "system") |
| `AI_FAILED → AI_PROCESSING`   | Retry, attempt 2 or 3         | `transitionStatus` (kind: "system") |
| `AI_FAILED → AI_COMPLETE`     | **Skip-AI after 3rd failure** | `transitionStatus` (kind: "system") |

The skip-AI edge `AI_FAILED → AI_COMPLETE` already exists — it was put there for exactly this scenario (mark the AI step "complete" so the case enters the doctor queue, even though no assessment was produced). On skip-AI: NO `ai_assessments` row is written. Doctor portal (Phase 4) reads `ai_assessments` by `consultationId` and renders an empty state when absent. Per SOT line 87, `AI_COMPLETE` means "case enters doctor queue" — the same destination whether AI succeeded or was skipped.

`AI_COMPLETE → ASSIGNED` (case picked up by a specific doctor) is owned by Phase 3D, not 3C.

### 4.3 Flag-code vocabulary (initial 12 for hair-loss MVP)

| Code                                              | Severity | Trigger heuristic (paraphrased from `docs/VERTICAL-HAIR-LOSS.md`)                        |
| ------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `FINASTERIDE_CAUTION_UNDER_25`                    | caution  | Male, age < 25 (line 203)                                                                |
| `FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING` | red_flag | Female, sex = "female", childbearing-age (line 208)                                      |
| `SCARRING_ALOPECIA_SUSPECT`                       | red_flag | Scalp pain/tenderness reported (line 341)                                                |
| `ALOPECIA_AREATA_SUSPECT`                         | red_flag | "Specific patches" pattern OR non-scalp hair loss (lines 224, 361)                       |
| `TELOGEN_EFFLUVIUM_TRIGGER_PRESENT`               | info     | Recent surgery / illness / childbirth / crash diet trigger (line 278)                    |
| `THYROID_HISTORY_LAB_PRIORITY`                    | caution  | Thyroid history reported (line 242)                                                      |
| `ANEMIA_SUSPECT_LAB_PRIORITY`                     | caution  | Anemia / iron deficiency history (line 242)                                              |
| `PCOS_HORMONAL_PATHWAY`                           | info     | Female + PCOS history (line 242)                                                         |
| `DRUG_INTERACTION_REVIEW`                         | caution  | Patient on blood thinner / beta-blocker / retinoid / SSRI / testosterone / steroid (295) |
| `PRE_EXISTING_SEXUAL_DYSFUNCTION`                 | caution  | Pre-existing libido / ED issues — finasteride warning (line 422)                         |
| `NON_SCALP_HAIR_LOSS`                             | red_flag | Hair loss from body areas other than scalp (line 361)                                    |
| `INSUFFICIENT_DATA`                               | info     | Empty / incomplete questionnaire — Claude refusal fallback                               |

Vocabulary is documented in code at `convex/consultations/aiAssessmentSchema.ts` as a const + literal-union zod enum; Claude is instructed to emit only these codes via the system prompt. Unknown codes from Claude → zod fails → retry.

## 5. File layout

**New files:**

| Path                                                                         | What                                                                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `convex/consultations/aiAssessment.ts`                                       | `kickoff` + `retry` internal actions; shared core handler                                                                              |
| `convex/consultations/aiAssessmentSchema.ts`                                 | zod schema + flag-code const + stage enum                                                                                              |
| `convex/consultations/prompts/hairLoss.ts`                                   | `buildHairLossPrompt(questionnaire) → { system, user }`; system prompt const                                                           |
| `convex/__tests__/consultations/aiAssessment.test.ts`                        | mocked branch coverage (~12 cases: success, retry-then-success, terminal-skip, refusal, zod-fail, client-error, transition assertions) |
| `convex/__tests__/test-claude/aiAssessment.test.ts`                          | 3-fixture live-API smoke (male AGA, female AGA, scarring red-flag); script `pnpm test:claude:ai`                                       |
| `convex/__tests__/fixtures/aiAssessment/{male-aga,female-aga,scarring}.json` | golden questionnaire payloads + assertion shapes                                                                                       |

**Modified files:**

| Path                                                                           | Change                                                                                                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `convex/schema.ts`                                                             | Add `ai_assessments` table + index                                                                                |
| `convex/consultations/submitConsultation.ts`                                   | Replace `internal.consultations.aiStub.kickoffAiStub` schedule with `internal.consultations.aiAssessment.kickoff` |
| `convex/lib/telemetry.ts`                                                      | Add `logAiAssessmentEvent(event, payload)`                                                                        |
| `apps/mobile/app/treatment/ai-processing.tsx` (or equivalent — verify in plan) | Add disclosure copy block                                                                                         |
| `package.json` (root)                                                          | Add `test:claude:ai` script — `vitest run convex/__tests__/test-claude/aiAssessment.test.ts`                      |
| `docs/DEFERRED.md`                                                             | Strike line 297 (3B → 3C handoff) on phase merge                                                                  |

**Deleted files:**

| Path                             | Reason                        |
| -------------------------------- | ----------------------------- |
| `convex/consultations/aiStub.ts` | Replaced by `aiAssessment.ts` |

## 6. Testing strategy

### 6.1 Mocked unit tests (CI-mandatory, vitest)

Reuse the 2.5B mocking pattern — single Anthropic SDK spy that exposes both `messages.create` and `beta.messages.create`. Cases (~12, deterministic):

1. **Happy path** — fixture answers → mock returns valid JSON → `ai_assessments` row written, transition AI_PROCESSING → AI_COMPLETE, telemetry "success" emitted, attempt=1.
2. **Retry-then-success** — first call rejects with `network_timeout`, scheduler runs retry, second call succeeds. Assert: 1 AI_FAILED → AI_PROCESSING transition, attempt=2 stamped on row.
3. **Triple failure → skip-AI** — all 3 calls reject. Assert: 3 attempts logged, final `transitionStatus` AI_FAILED → AI_COMPLETE (kind: "system") fires, NO `ai_assessments` row written, `consultation_status_history` has 6 rows (3× AI_PROCESSING, 3× AI_FAILED, 1× AI_COMPLETE) all with `kind: "system"`.
4. **Zod failure → retry** — mock returns malformed JSON. Assert in-process retry (single re-prompt) before bumping attempt counter.
5. **Refusal** — mock returns `stop_reason: "refusal"`. Same path as zod failure.
6. **Client error → skip-AI on attempt 1** — mock rejects with 401. Assert: NO retries scheduled, single `transitionStatus` AI_FAILED → AI_COMPLETE (kind: "system") fires, telemetry classifies `client_error`.
7. **Skip-AI invariant** — after skip-AI path, `consultations.status === "AI_COMPLETE"` AND no `ai_assessments` row exists for that `consultationId`. Doctor portal (Phase 4) must handle this empty state.
8. **Idempotency** — second `kickoff` for same consultationId already in AI_COMPLETE no-ops.
9. **Cost recording** — mock returns usage block; assert `costPaisa` computed from tokens (model-specific rate constants), all 4 token fields stamped.
10. **Schema upsert** — second successful run for same consultationId overwrites existing row, single row remains.
11. **Telemetry no-PHI** — assert `logAiAssessmentEvent` payloads contain `consultationId` (id, not name) but no questionnaire content, no narrative.
12. **Empty questionnaire** — mock returns `INSUFFICIENT_DATA` flag + low confidence. Assert row written with that shape (graceful degradation, no failure).

### 6.2 Live-API smoke (`pnpm test:claude:ai`, manual + conditional CI gate)

3 fixtures, real `client.beta.messages.create`. Per-fixture assertions are structural (not verbatim string match):

| Fixture      | Patient profile                                             | Required assertions                                                                                                           |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `male-aga`   | 32M, gradual onset, family history strong, crown + hairline | `stage.scale === "norwood"`, `stage.value` matches `/^III/` or `/^IV/`, `flags` contains no `red_flag` items                  |
| `female-aga` | 38F, widening part, post-pregnancy onset                    | `stage.scale === "ludwig"`, `flags` contains `FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING` (red_flag), `confidence > 0.4` |
| `scarring`   | 45M, scalp pain + redness + bumps, sudden patch             | `flags` contains `SCARRING_ALOPECIA_SUSPECT` (red_flag), `stage.scale` may be `unclassified`, `confidence > 0.5`              |

CI gate: skip if `ANTHROPIC_API_KEY` env var absent (matches 2.5B pattern — `4f5fc2c`). Run cost capped at ~₹3 / run. Manual run is the merge gate; CI run is opportunistic drift detector.

Goldens are NOT byte-exact JSON snapshots — narrative phrasing and flag wording are non-deterministic. Goldens are structural assertions. Bumping `promptVersion` invalidates and re-establishes golden assertions in same PR.

### 6.3 Test counts target at merge

- `pnpm test:convex` — current 250/250, plus ~12 new = ~262 / 1 skipped
- `pnpm test:claude:ai` — 3/3 (manual run, captured in checkpoint)
- `pnpm --filter @onlyou/mobile test` — current 260/260 + ~2 new for disclosure copy assertion = ~262/262
- `pnpm -w typecheck` clean
- `pnpm -w lint` clean

## 7. Risks + mitigations

| Risk                                                            | Likelihood | Mitigation                                                                                                                              |
| --------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Claude emits flag codes outside vocabulary                      | medium     | zod literal-union enum rejects → triggers retry; system prompt enumerates valid codes verbatim                                          |
| Claude refuses on female-childbearing contraindication framing  | medium     | System prompt explicitly authorizes flagging contraindications as clinical alerts (not advice to patient); refusal-heuristic retry path |
| Patient panic if disclosure copy too prominent                  | low        | Caption typography, secondary color, below-fold placement; founder visual review before merge                                           |
| Cost overrun if retry storm (e.g. SDK regression)               | low        | Hard cap: max 3 attempts per consultation, schedule-based not in-process loop; per-attempt cost logged for budget audit                 |
| Live-API smoke flakes on `confidence > 0.4` assertion           | medium     | Use ranges not point-equality; if flake recurs in practice, lower bounds and document acceptance window in fixture JSON                 |
| `ai_assessments` table grows unboundedly                        | low        | 1:1 with consultation, latest-only — bounded by consultation count. Failed-attempt logs in telemetry only.                              |
| Doctor portal (Phase 4) needs schema field 3C didn't anticipate | medium     | Forward-compat fields (`photoAnalysis?`, `recommendedTemplateHint?`, `redFlags?`) already optional; schema migrations are additive.     |

## 8. Acceptance gates

Phase 3C is mergeable only when:

1. All §6.1 mocked tests pass in CI.
2. `pnpm test:claude:ai` manually run by the developer with 3/3 pass; captures + costs logged in checkpoint.
3. `pnpm -w typecheck` + `pnpm -w lint` clean.
4. Code review (per `CLAUDE.md` §10) committed at `docs/superpowers/reviews/2026-04-25-phase-3c-ai-pre-assessment-review.md`; all important findings resolved or DEFERRED with ledger entry.
5. Live E2E on physical Android device — submit a real questionnaire, observe in Convex dashboard:
   - `consultations` row transitions SUBMITTED → AI_PROCESSING → AI_COMPLETE,
   - `ai_assessments` row written with non-empty narrative + valid stage + flag list,
   - patient app shows "AI is reviewing" briefly, then "Ready for doctor",
   - patient never sees raw AI output,
   - disclosure copy visible on processing screen.
6. Founder visual approval of disclosure-copy screen.
7. Cost-cap sanity check: one full E2E run < ₹2; logged in checkpoint.
8. `docs/DEFERRED.md` line 297 struck through with merge commit reference.

## 9. What ships next (handoff to Phase 3D)

Phase 3D = doctor simulator (CLI + Convex dashboard mutations per decision register D3). 3D needs:

- Read access to `ai_assessments` row by `consultationId` (already covered by `by_consultation` index).
- Empty-state handling when row is absent (skip-AI case).
- Templates picked by operator via explicit `templateId` (D4 — no auto-recommend).
- Existing transitions consumed by 3D: `AI_COMPLETE → ASSIGNED → REVIEWING → {PRESCRIBED, DECLINED, REFERRED, LAB_ORDERED, MORE_INFO_REQUESTED, COMPLETED}` — all already in `validTransitions`. 3D adds no new edges.

3C output is read-only after merge; 3D treats `ai_assessments` rows as immutable inputs.

---

## Open questions for plan phase

None blocking design approval. Items for the planner to resolve:

- Confirm exact path of the 3B AI-processing screen (`apps/mobile/app/treatment/ai-processing.tsx` is the assumed path; verify in plan Task 0).
- Decide whether `attempt` field on `ai_assessments` row reflects the successful-attempt index or just the last-attempt counter when the row was written. Spec assumes "successful-attempt index" (e.g. on 2nd-try success, `attempt: 2`).
- Confirm cost rate constants for Sonnet 4.6 are still `$3/1M input` / `$15/1M output` / `$0.30/1M cache-read` at execution time. If pricing changes, update the rate constants in `convex/lib/claude.ts` not the assessment code.
