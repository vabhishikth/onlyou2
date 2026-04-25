# Phase 3C — AI Pre-Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `convex/consultations/aiStub.ts` with a real Claude (Sonnet 4.6) action that reads the patient's questionnaire answers and produces a structured pre-assessment (`{narrative, stage, flags, confidence}`) for the doctor. Patient sees a brief AI-disclosure line on the post-submit confirmation screen and never sees raw AI output. After 3 retry attempts the case skips to the doctor queue (status `AI_COMPLETE`) with no `ai_assessments` row.

**Architecture:** Single Convex action chain: kickoff → transition `SUBMITTED → AI_PROCESSING` → call Claude with cached system prompt + per-call user prompt → zod-validate → write `ai_assessments` row + transition `→ AI_COMPLETE`. Failure path classifies the error, schedules a retry (30s / 2m / 5m backoff) up to 3 attempts, then on terminal failure transitions `AI_FAILED → AI_COMPLETE` (existing edge in `validTransitions`) with `kind: "system"`. Patient confirmation screen gains one disclosure line; everything else is unchanged.

**Tech Stack:** Convex (schema, internal actions / mutations / queries, scheduler) · TypeScript · Zod 4 · `@anthropic-ai/sdk` (already wired in 2.5B at `convex/lib/claude.ts`) · vitest · jest-expo for the mobile screen test.

**Spec:** `docs/superpowers/specs/2026-04-25-phase-3c-ai-pre-assessment-design.md`.
**Decision register:** `docs/decisions/2026-04-24-phase-3-decomposition.md` D2 (Option B locked).
**Skip-AI design choice:** `docs/decisions/2026-04-25-phase-3c-skip-ai-via-existing-edge.md`.

**Verified preconditions on master tip `b6cfab3`:**

- `consultations` table fields: `userId: Id<"users">`, `vertical`, `status`, `statusUpdatedAt`, `submittedAt`, `createdAt`, `assignedDoctorId?`, etc. (`convex/consultations/schema.ts:55-69`).
- `questionnaire_responses` fields: `consultationId`, `userId`, `schemaVersion`, `answers`, `completedAt` (`schema.ts:71-77`).
- `consultation_status_history` fields: `consultationId`, `fromStatus?`, `toStatus`, `kind`, `actorUserId?`, `reason?`, `changedAt` (`schema.ts:90-98`).
- `transitionStatus` exposes `kind: "user"|"doctor"|"admin"|"system"`, validates against `validTransitions`. `validTransitions[AI_PROCESSING] = ["AI_COMPLETE","AI_FAILED"]`, `validTransitions[AI_FAILED] = ["AI_PROCESSING","AI_COMPLETE"]` — every edge 3C uses already exists (`convex/consultations/transitions.ts`).
- `submitConsultation` schedules `internal.consultations.aiStub.kickoffAiStub` at `submitConsultation.ts:89-93` — that's the single call site to repoint.
- `convex/lib/claude.ts` exports `MODEL_EXTRACTION = "claude-sonnet-4-6"`, `BETA_HEADER_EXTENDED_CACHE`, `RawClaudeResponse` interface; pattern is `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` per call. **No `getAnthropicClient` factory exists** — Task 3 adds one for testability.
- `convex/lib/telemetry.ts` exports `hashUserId` + `logParseEvent`. Pattern: single function taking a `{level, event, ...}` fields object; serializes via `JSON.stringify` + `console.log/warn/error`. **Match this pattern in `logAiAssessmentEvent`.**
- Mobile patient flow post-submit: `review.tsx` calls `submit()` → `router.push("/treatment/confirmation")`. There is **no** dedicated AI-processing screen. `confirmation.tsx` (`apps/mobile/app/treatment/confirmation.tsx`) is where the disclosure line lands.
- Existing convex-test pattern: `convexTest(schema, modules)` takes 2 args; `import { modules } from "../setup"` (verify exact path in Task 0). **No `t.finishAllScheduledFunctions()` API** — retry tests invoke `internal.consultations.aiAssessment.retry` directly rather than flushing scheduler.

---

## File Structure

### New files

| File                                                                       | Responsibility                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `convex/consultations/aiAssessmentSchema.ts`                               | Zod schema, 12-code flag vocabulary const + literal-union, stage-scale enum, `PROMPT_VERSION_HAIR_LOSS` constant.                                                                   |
| `convex/consultations/prompts/hairLoss.ts`                                 | System-prompt const + `buildHairLossUserPrompt(answers, demographics) → string`.                                                                                                    |
| `convex/consultations/aiAssessment.ts`                                     | Single module containing internal queries `getConsultation` / `getResponses`, internal mutation `upsertAssessment`, pure helper `runAttempt`, internal actions `kickoff` / `retry`. |
| `convex/__tests__/consultations/aiAssessmentSchema.test.ts`                | Zod schema accept / reject cases.                                                                                                                                                   |
| `convex/__tests__/consultations/prompts.test.ts`                           | System-prompt content asserts + user-prompt builder structure.                                                                                                                      |
| `convex/__tests__/consultations/aiAssessment.test.ts`                      | Mocked end-to-end suite: happy path, retry-then-success, triple-fail-skip, zod-fail, refusal, client-error, idempotency, cost, upsert overwrite, no-PHI, empty-questionnaire.       |
| `convex/__tests__/lib/claude-cost.test.ts`                                 | `computeCostPaisa` math + integer rounding + cache-read discount.                                                                                                                   |
| `convex/__tests__/lib/telemetry-ai.test.ts`                                | `logAiAssessmentEvent` level routing + PHI guard + matches `logParseEvent` shape.                                                                                                   |
| `convex/__tests__/test-claude/aiAssessment.test.ts`                        | 3-fixture live-API smoke (skipped when `ANTHROPIC_API_KEY` absent).                                                                                                                 |
| `convex/__tests__/fixtures/aiAssessment/male-aga.json`                     | 32M classic Norwood pattern.                                                                                                                                                        |
| `convex/__tests__/fixtures/aiAssessment/female-aga.json`                   | 38F post-pregnancy widening-part pattern.                                                                                                                                           |
| `convex/__tests__/fixtures/aiAssessment/scarring.json`                     | 45M scarring-suspect (scalp pain + redness + sudden patch).                                                                                                                         |
| `apps/mobile/__tests__/screens/treatment/confirmation-disclosure.test.tsx` | Asserts disclosure copy renders on confirmation screen + no raw AI output ever leaks.                                                                                               |

### Modified files

| File                                         | Change                                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `convex/schema.ts`                           | Add `ai_assessments` table + `by_consultation` index (Task 1).                                                                                                                                         |
| `convex/lib/claude.ts`                       | Add `getAnthropicClient()` factory (test seam) + `SONNET_4_6_RATES` + `computeCostPaisa(...)`. Refactor `callExtraction` / `callNarrative` / `callAutoDraftRange` to use the factory in the same task. |
| `convex/lib/telemetry.ts`                    | Add `AiAssessmentEvent` type + `AiAssessmentLogFields` interface + `logAiAssessmentEvent(fields)` mirroring `logParseEvent`.                                                                           |
| `convex/consultations/submitConsultation.ts` | One-line change at `submitConsultation.ts:89-93` — repoint scheduler from `internal.consultations.aiStub.kickoffAiStub` to `internal.consultations.aiAssessment.kickoff`.                              |
| `apps/mobile/app/treatment/confirmation.tsx` | Insert one disclosure-copy line below the existing 3-step list.                                                                                                                                        |
| `package.json` (root)                        | Add `test:claude:ai` script.                                                                                                                                                                           |
| `docs/DEFERRED.md`                           | Strike line 297 with merge-commit reference (Task 17).                                                                                                                                                 |
| `checkpoint.md`                              | Phase 3C close-out section (Task 17).                                                                                                                                                                  |

### Deleted files

| File                             | Reason                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `convex/consultations/aiStub.ts` | Replaced by `aiAssessment.ts`. Last reference repointed in Task 9; deletion in Task 10 after grep confirms zero callers. |

---

## Task 0: Verify + scaffold worktree

**Files:** read-only + git worktree operations.

This task does ALL preflight reads + worktree creation. Subsequent tasks assume nothing about the codebase that this task didn't verify.

- [ ] **Step 1: Create worktree from master tip**

```bash
git worktree add -b phase-3c ../onlyou2-phase-3c master
```

Expected: `Preparing worktree (new branch 'phase-3c')` + `HEAD is now at b6cfab3 docs(phase-3c): checkpoint + decision record for spec self-review insight` (or later master tip).

- [ ] **Step 2: Copy gitignored env files into worktree**

```bash
cp /d/onlyou2/.env.local /d/onlyou2-phase-3c/.env.local
cp /d/onlyou2/apps/mobile/.env.local /d/onlyou2-phase-3c/apps/mobile/.env.local
```

Per memory `feedback_env_local_not_in_worktree.md` — gitignored files don't inherit; Expo and `npx convex dev` need these.

- [ ] **Step 3: Move into worktree and install**

```bash
cd /d/onlyou2-phase-3c
pnpm install
```

Expected: lockfile unchanged or only minor diffs.

- [ ] **Step 4: Verify baseline tests are green**

```bash
pnpm -w typecheck
pnpm -w lint
pnpm test:convex
pnpm --filter @onlyou/mobile test
```

Expected:

- typecheck: `Tasks: 6 successful, 6 total`
- lint: clean (4 known UI import-order warnings is acceptable per checkpoint)
- convex: `250 passed | 1 skipped`
- mobile: `260 passed`

If anything is red, stop. Do not start writing 3C code on a red baseline.

- [ ] **Step 5: Verify the convex-test setup file path + modules import**

```bash
find convex/__tests__ -name "setup*" -o -name "_setup*" | head -3
grep -l "modules" convex/__tests__/auth/socialSignIn.test.ts
head -5 convex/__tests__/auth/socialSignIn.test.ts
```

Note the exact `import { modules } from "..."` path used in existing convex tests. The aiAssessment test file in Task 11 will use the same path.

- [ ] **Step 6: Verify schema fields match assumptions**

```bash
grep -A 4 "consultations = {" convex/consultations/schema.ts
grep -A 4 "questionnaire_responses = {" convex/consultations/schema.ts
```

Confirm: `consultations` has `userId` (not `patientUserId`), `submittedAt`, `createdAt`. `questionnaire_responses` has `userId`, `schemaVersion`, `answers`, `completedAt`. If any diverge from this assumption, stop and reconcile before proceeding — every test fixture in this plan depends on these field names.

- [ ] **Step 7: Verify `aiStub.ts` callers**

```bash
grep -rn "aiStub\|kickoffAiStub" --include="*.ts" --include="*.tsx" .
```

Expected matches: `convex/consultations/aiStub.ts` (definition) + `convex/consultations/submitConsultation.ts:89-93` (one schedule call). Anything else is an unexpected dependency — investigate before deleting in Task 10.

- [ ] **Step 8: Verify the confirmation screen exists at the assumed path**

```bash
ls apps/mobile/app/treatment/confirmation.tsx
ls apps/mobile/__tests__/screens/treatment/confirmation.test.tsx
```

Expected: both files exist. Task 15 modifies `confirmation.tsx` and adds a sibling test file `confirmation-disclosure.test.tsx`.

- [ ] **Step 9: Verify Anthropic SDK constructor pattern**

```bash
grep -n "new Anthropic" convex/lib/claude.ts
```

Expected: 3 matches (one per `callExtraction`, `callNarrative`, `callAutoDraftRange`). Task 3 replaces these with `getAnthropicClient()` calls.

- [ ] **Step 10: Commit nothing in Task 0 — read-only setup.**

---

## Task 1: Add `ai_assessments` table to schema

**Files:**

- Modify: `convex/schema.ts`

- [ ] **Step 1: Read `convex/schema.ts`**

Open the file. Locate the consultation-domain table cluster (`consultations`, `questionnaire_responses`, `photos`, `consultation_status_history`). Insert the new `ai_assessments` block adjacent to them.

- [ ] **Step 2: Add the table**

Insert this block (placement: directly after `consultation_status_history`):

```ts
ai_assessments: defineTable({
  consultationId: v.id("consultations"),

  // Provenance
  model: v.string(),
  promptVersion: v.string(),
  attempt: v.number(),

  // Option B output
  narrative: v.string(),
  stage: v.object({
    scale: v.union(
      v.literal("norwood"),
      v.literal("ludwig"),
      v.literal("unclassified"),
    ),
    value: v.string(),
    confidence: v.number(),
  }),
  flags: v.array(
    v.object({
      code: v.string(),
      severity: v.union(
        v.literal("info"),
        v.literal("caution"),
        v.literal("red_flag"),
      ),
      message: v.string(),
    }),
  ),
  confidence: v.number(),

  // Option C forward-compat (always undefined in 3C)
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
}).index("by_consultation", ["consultationId"]),
```

- [ ] **Step 3: Run `convex dev --once` to deploy schema**

```bash
npx convex dev --once
```

Expected: schema deploys, `_generated/dataModel.d.ts` regenerates with the new table type.

- [ ] **Step 4: Run typecheck**

```bash
pnpm -w typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/_generated/
git commit -m "feat(phase-3c): add ai_assessments table + by_consultation index"
```

---

## Task 2: Zod schema + flag-code vocabulary

**Files:**

- Create: `convex/consultations/aiAssessmentSchema.ts`
- Test: `convex/__tests__/consultations/aiAssessmentSchema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `convex/__tests__/consultations/aiAssessmentSchema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  aiAssessmentResponseSchema,
  FLAG_CODES,
  PROMPT_VERSION_HAIR_LOSS,
  STAGE_SCALES,
} from "../../consultations/aiAssessmentSchema";

const validResponse = {
  narrative:
    "32-year-old male with classic Norwood III pattern hair loss; family history strong on maternal side.",
  stage: { scale: "norwood", value: "III", confidence: 0.85 },
  flags: [
    {
      code: "FINASTERIDE_CAUTION_UNDER_25",
      severity: "caution",
      message: "Patient under 25; counsel re: finasteride.",
    },
  ],
  confidence: 0.82,
};

describe("aiAssessmentResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = aiAssessmentResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown flag code", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      flags: [
        {
          code: "NOT_A_REAL_CODE",
          severity: "info",
          message: "x",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid stage scale", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      stage: { scale: "bogus", value: "I", confidence: 0.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative stage.confidence", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      stage: { ...validResponse.stage, confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects narrative shorter than 20 chars", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      narrative: "too short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty flags array", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      flags: [],
    });
    expect(result.success).toBe(true);
  });

  it("FLAG_CODES contains exactly 12 entries", () => {
    expect(FLAG_CODES.length).toBe(12);
  });

  it("STAGE_SCALES is the 3-value enum", () => {
    expect(STAGE_SCALES).toEqual(["norwood", "ludwig", "unclassified"]);
  });

  it("PROMPT_VERSION_HAIR_LOSS is hair-loss-v1", () => {
    expect(PROMPT_VERSION_HAIR_LOSS).toBe("hair-loss-v1");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm test:convex -- aiAssessmentSchema
```

Expected: `Cannot find module '../../consultations/aiAssessmentSchema'`.

- [ ] **Step 3: Create `convex/consultations/aiAssessmentSchema.ts`**

```ts
import { z } from "zod";

export const PROMPT_VERSION_HAIR_LOSS = "hair-loss-v1" as const;

export const STAGE_SCALES = ["norwood", "ludwig", "unclassified"] as const;
export type StageScale = (typeof STAGE_SCALES)[number];

// Hair-loss MVP vocabulary. Sourced from docs/VERTICAL-HAIR-LOSS.md "AI use" notes.
// Order is documentation-aligned, not prioritized — severity is encoded in the
// emitted flag entries by the model, not in the code list.
export const FLAG_CODES = [
  "FINASTERIDE_CAUTION_UNDER_25",
  "FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING",
  "SCARRING_ALOPECIA_SUSPECT",
  "ALOPECIA_AREATA_SUSPECT",
  "TELOGEN_EFFLUVIUM_TRIGGER_PRESENT",
  "THYROID_HISTORY_LAB_PRIORITY",
  "ANEMIA_SUSPECT_LAB_PRIORITY",
  "PCOS_HORMONAL_PATHWAY",
  "DRUG_INTERACTION_REVIEW",
  "PRE_EXISTING_SEXUAL_DYSFUNCTION",
  "NON_SCALP_HAIR_LOSS",
  "INSUFFICIENT_DATA",
] as const;
export type FlagCode = (typeof FLAG_CODES)[number];

export const SEVERITIES = ["info", "caution", "red_flag"] as const;
export type Severity = (typeof SEVERITIES)[number];

const flagSchema = z.object({
  code: z.enum(FLAG_CODES),
  severity: z.enum(SEVERITIES),
  message: z.string().min(1).max(500),
});

const stageSchema = z.object({
  scale: z.enum(STAGE_SCALES),
  value: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
});

export const aiAssessmentResponseSchema = z.object({
  narrative: z.string().min(20).max(2000),
  stage: stageSchema,
  flags: z.array(flagSchema).max(20),
  confidence: z.number().min(0).max(1),
});

export type AiAssessmentResponse = z.infer<typeof aiAssessmentResponseSchema>;
```

- [ ] **Step 4: Re-run test**

```bash
pnpm test:convex -- aiAssessmentSchema
```

Expected: 10/10 pass.

- [ ] **Step 5: Run full convex suite**

```bash
pnpm test:convex
```

Expected: 260 passed (250 baseline + 10 new) / 1 skipped.

- [ ] **Step 6: Commit**

```bash
git add convex/consultations/aiAssessmentSchema.ts convex/__tests__/consultations/aiAssessmentSchema.test.ts
git commit -m "feat(phase-3c): zod schema + 12-code flag vocabulary"
```

---

## Task 3: `getAnthropicClient` factory + cost-rate constants + `computeCostPaisa`

**Files:**

- Modify: `convex/lib/claude.ts`
- Test: `convex/__tests__/lib/claude-cost.test.ts`

This task adds the test-seam factory + cost helper. It also refactors the three existing call sites (`callExtraction`, `callNarrative`, `callAutoDraftRange`) to use the factory so future tests can mock once.

- [ ] **Step 1: Write the failing cost test**

Create `convex/__tests__/lib/claude-cost.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { computeCostPaisa, SONNET_4_6_RATES } from "../../lib/claude";

describe("computeCostPaisa", () => {
  it("computes input-only cost: $3 / 1M tokens × usdToPaisa", () => {
    const cost = computeCostPaisa({
      tokensInput: 1_000_000,
      tokensOutput: 0,
      tokensCacheRead: 0,
    });
    expect(cost).toBe(Math.round(3 * SONNET_4_6_RATES.usdToPaisa));
  });

  it("computes output-only cost: $15 / 1M tokens × usdToPaisa", () => {
    const cost = computeCostPaisa({
      tokensInput: 0,
      tokensOutput: 1_000_000,
      tokensCacheRead: 0,
    });
    expect(cost).toBe(Math.round(15 * SONNET_4_6_RATES.usdToPaisa));
  });

  it("computes cache-read cost at 10× discount vs fresh input ($0.30 vs $3.00)", () => {
    const allInput = computeCostPaisa({
      tokensInput: 1_000_000,
      tokensOutput: 0,
      tokensCacheRead: 0,
    });
    const allCache = computeCostPaisa({
      tokensInput: 0,
      tokensOutput: 0,
      tokensCacheRead: 1_000_000,
    });
    expect(allCache * 10).toBe(allInput);
  });

  it("returns an integer", () => {
    const cost = computeCostPaisa({
      tokensInput: 1,
      tokensOutput: 1,
      tokensCacheRead: 1,
    });
    expect(Number.isInteger(cost)).toBe(true);
    expect(cost).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 for all-zero input", () => {
    expect(
      computeCostPaisa({ tokensInput: 0, tokensOutput: 0, tokensCacheRead: 0 }),
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm test:convex -- claude-cost
```

Expected: `computeCostPaisa is not exported` (or module compile error).

- [ ] **Step 3: Add the helpers to `convex/lib/claude.ts`**

Insert near the top, after the existing `MODEL_*` constants (above `// ---------- Extraction ----------`):

```ts
// Test seam — every Claude call site goes through this factory so the
// SDK constructor is mockable from a single import.
export function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Sonnet 4.6 list pricing as of Jan 2026. Update if Anthropic adjusts pricing.
// Verified: https://platform.claude.com/docs/en/docs/about-claude/models
export const SONNET_4_6_RATES = {
  inputUsdPerMillion: 3,
  outputUsdPerMillion: 15,
  cacheReadUsdPerMillion: 0.3,
  // Fixed exchange rate for deterministic per-call cost recording.
  // ₹83.33 / USD = 8333 paisa / USD.
  usdToPaisa: 8333,
} as const;

export function computeCostPaisa(args: {
  tokensInput: number;
  tokensOutput: number;
  tokensCacheRead: number;
}): number {
  const inputUsd =
    (args.tokensInput / 1_000_000) * SONNET_4_6_RATES.inputUsdPerMillion;
  const outputUsd =
    (args.tokensOutput / 1_000_000) * SONNET_4_6_RATES.outputUsdPerMillion;
  const cacheUsd =
    (args.tokensCacheRead / 1_000_000) *
    SONNET_4_6_RATES.cacheReadUsdPerMillion;
  return Math.round(
    (inputUsd + outputUsd + cacheUsd) * SONNET_4_6_RATES.usdToPaisa,
  );
}
```

- [ ] **Step 4: Refactor existing call sites to use the factory**

Replace each occurrence of `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` (3 sites: `callExtraction`, `callNarrative`, `callAutoDraftRange`) with `getAnthropicClient()`. Example:

```diff
   export async function callExtraction(input: ExtractionInput): Promise<ExtractionResponse> {
-    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
+    const client = getAnthropicClient();
```

Same change in `callNarrative` and `callAutoDraftRange`.

- [ ] **Step 5: Run cost test + full convex suite**

```bash
pnpm test:convex -- claude-cost
pnpm test:convex
```

Expected: cost test 5/5 pass. Full suite still 265 passed (260 + 5) / 1 skipped. The factory refactor is behavior-preserving — existing tests should not regress.

- [ ] **Step 6: Commit**

```bash
git add convex/lib/claude.ts convex/__tests__/lib/claude-cost.test.ts
git commit -m "feat(phase-3c): getAnthropicClient factory + Sonnet 4.6 cost helpers"
```

---

## Task 4: `logAiAssessmentEvent` telemetry helper

**Files:**

- Modify: `convex/lib/telemetry.ts`
- Test: `convex/__tests__/lib/telemetry-ai.test.ts`

Mirror the existing `logParseEvent` pattern: single function taking a `{level, event, ...}` fields object; `JSON.stringify` payload; route to `console.log/warn/error` by `level`.

- [ ] **Step 1: Write the failing test**

Create `convex/__tests__/lib/telemetry-ai.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { logAiAssessmentEvent } from "../../lib/telemetry";

describe("logAiAssessmentEvent", () => {
  const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    consoleLog.mockClear();
    consoleWarn.mockClear();
    consoleError.mockClear();
  });

  it("level=info routes to console.log with serialized JSON", () => {
    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_started",
      consultationId: "c123",
      attempt: 1,
    });
    expect(consoleLog).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: "info",
      event: "ai_assessment_started",
      consultationId: "c123",
      attempt: 1,
    });
    expect(payload.ts).toBeTypeOf("number");
  });

  it("level=warn routes to console.warn (terminal_skip case)", () => {
    logAiAssessmentEvent({
      level: "warn",
      event: "ai_assessment_terminal_skip",
      consultationId: "c123",
      totalAttempts: 3,
    });
    expect(consoleWarn).toHaveBeenCalledTimes(1);
  });

  it("level=error routes to console.error (failure case)", () => {
    logAiAssessmentEvent({
      level: "error",
      event: "ai_assessment_failed",
      consultationId: "c123",
      attempt: 2,
      failureClass: "rate_limit",
      errorMessage: "429 Too Many Requests",
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("hashes userId when present", () => {
    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_succeeded",
      consultationId: "c123",
      userId: "user-abc",
      attempt: 1,
      durationMs: 12_400,
    });
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(payload.userId).toBeUndefined();
    expect(payload.hashedUserId).toBeTypeOf("string");
    expect(payload.hashedUserId).toHaveLength(12);
  });

  it("strips PHI fields if accidentally passed", () => {
    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_succeeded",
      consultationId: "c123",
      // @ts-expect-error — these aren't on the field type, but test the runtime guard
      narrative: "should be dropped",
      // @ts-expect-error
      patientName: "should be dropped",
    });
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(payload).not.toHaveProperty("narrative");
    expect(payload).not.toHaveProperty("patientName");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm test:convex -- telemetry-ai
```

Expected: `logAiAssessmentEvent is not exported`.

- [ ] **Step 3: Append to `convex/lib/telemetry.ts`**

```ts
export type AiAssessmentEvent =
  | "ai_assessment_started"
  | "ai_assessment_succeeded"
  | "ai_assessment_failed"
  | "ai_assessment_terminal_skip";

export interface AiAssessmentLogFields {
  level: ParseLogLevel;
  event: AiAssessmentEvent;
  consultationId: string;
  userId?: string;
  attempt?: number;
  totalAttempts?: number;
  durationMs?: number;
  tokensInput?: number;
  tokensOutput?: number;
  tokensCacheRead?: number;
  costPaisa?: number;
  failureClass?: string;
  errorMessage?: string;
}

const FORBIDDEN_PHI_FIELDS = new Set([
  "narrative",
  "questionnaire",
  "answers",
  "patientName",
  "name",
  "email",
  "phone",
]);

export function logAiAssessmentEvent(fields: AiAssessmentLogFields): void {
  const { userId, ...rest } = fields;
  const safeRest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (FORBIDDEN_PHI_FIELDS.has(k)) continue;
    safeRest[k] = v;
  }
  const payload: Record<string, unknown> = {
    ...safeRest,
    ts: Date.now(),
  };
  if (userId) {
    payload.hashedUserId = hashUserId(userId);
  }
  const serialized = JSON.stringify(payload);
  if (fields.level === "error") {
    console.error(serialized);
  } else if (fields.level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}
```

- [ ] **Step 4: Run test**

```bash
pnpm test:convex -- telemetry-ai
```

Expected: 5/5 pass.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/telemetry.ts convex/__tests__/lib/telemetry-ai.test.ts
git commit -m "feat(phase-3c): logAiAssessmentEvent matching logParseEvent shape"
```

---

## Task 5: Hair-loss prompt builder

**Files:**

- Create: `convex/consultations/prompts/hairLoss.ts`
- Test: `convex/__tests__/consultations/prompts.test.ts`

- [ ] **Step 1: Skim the source-of-truth files for the question-id naming convention**

```bash
head -80 apps/mobile/src/data/questionnaires/hair-loss.ts
```

Note: question ids look like `q1_age`, `q2_sex` (lowercase). Use the same convention in fixtures + prompt builder.

- [ ] **Step 2: Write the failing test**

Create `convex/__tests__/consultations/prompts.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { FLAG_CODES } from "../../consultations/aiAssessmentSchema";
import {
  buildHairLossUserPrompt,
  HAIR_LOSS_SYSTEM_PROMPT,
} from "../../consultations/prompts/hairLoss";

describe("HAIR_LOSS_SYSTEM_PROMPT", () => {
  it("enumerates every flag code from FLAG_CODES verbatim", () => {
    for (const code of FLAG_CODES) {
      expect(HAIR_LOSS_SYSTEM_PROMPT).toContain(code);
    }
  });

  it("forbids addressing the patient directly", () => {
    expect(HAIR_LOSS_SYSTEM_PROMPT.toLowerCase()).toMatch(
      /never address the patient/,
    );
  });

  it("requires JSON-only output (no prose, no code-fence)", () => {
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/JSON/);
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/no code fence|no code-fence/i);
  });

  it("documents Norwood + Ludwig + unclassified scales", () => {
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/Norwood/);
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/Ludwig/);
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/unclassified/);
  });
});

describe("buildHairLossUserPrompt", () => {
  const baseAnswers = {
    q1_age: 32,
    q2_sex: "male",
    q3_pattern_male: ["crown", "hairline"],
    q4_age_of_onset: 28,
  };
  const baseDemo = { age: 32, sex: "male" as const };

  it("includes a demographics header", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).toMatch(/age:\s*32/i);
    expect(out).toMatch(/sex:\s*male/i);
  });

  it("renders each answered question on its own line", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).toContain("q1_age");
    expect(out).toContain("q3_pattern_male");
  });

  it("formats array answers comma-separated", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).toMatch(/q3_pattern_male:\s*crown,\s*hairline/);
  });

  it("does not leak fields beyond what was passed", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).not.toMatch(/password|phoneNumber|email/i);
  });
});
```

- [ ] **Step 3: Run test to verify failure**

```bash
pnpm test:convex -- prompts
```

- [ ] **Step 4: Create `convex/consultations/prompts/hairLoss.ts`**

```ts
import { FLAG_CODES, STAGE_SCALES } from "../aiAssessmentSchema";

export type Demographics = {
  age: number;
  sex: "male" | "female";
};

export const HAIR_LOSS_SYSTEM_PROMPT =
  `You are a clinical assistant supporting a licensed dermatologist reviewing a hair-loss telehealth case for an Indian telehealth platform. The doctor sees the questionnaire, photos, and your output. Your output is internal — never address the patient directly. The doctor makes all medical decisions.

Output: a single JSON object matching exactly this shape, no prose, no markdown, no code fence:

{
  "narrative": string,
  "stage": {
    "scale": "${STAGE_SCALES.join('" | "')}",
    "value": string,
    "confidence": number
  },
  "flags": [
    { "code": string, "severity": "info" | "caution" | "red_flag", "message": string }
  ],
  "confidence": number
}

Stage classification rules:
- Male patients with androgenetic alopecia (AGA) — use scale "norwood". Valid values: I, II, IIa, III, IIIa, IIIv, IV, V, VI, VII.
- Female patients with AGA — use scale "ludwig". Valid values: I, II, III.
- Alopecia areata, scarring alopecia, telogen effluvium without AGA, or otherwise unclassifiable patterns — use scale "unclassified" with a value describing what you suspect (e.g. "alopecia areata suspect", "scarring alopecia suspect", "non-AGA telogen effluvium").

Flag codes — use ONLY codes from this list. Do not invent new codes. Each code's intended trigger:
- FINASTERIDE_CAUTION_UNDER_25 (caution): male, age < 25, AGA pattern.
- FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING (red_flag): female, childbearing-age, AGA pattern.
- SCARRING_ALOPECIA_SUSPECT (red_flag): scalp pain or tenderness reported.
- ALOPECIA_AREATA_SUSPECT (red_flag): "specific patches" pattern or non-scalp hair loss.
- TELOGEN_EFFLUVIUM_TRIGGER_PRESENT (info): recent surgery, illness, childbirth, or crash diet trigger.
- THYROID_HISTORY_LAB_PRIORITY (caution): thyroid history reported.
- ANEMIA_SUSPECT_LAB_PRIORITY (caution): anemia or iron-deficiency history.
- PCOS_HORMONAL_PATHWAY (info): female with PCOS history.
- DRUG_INTERACTION_REVIEW (caution): patient on blood thinner / beta-blocker / retinoid / SSRI / testosterone / steroid.
- PRE_EXISTING_SEXUAL_DYSFUNCTION (caution): pre-existing libido or ED issues — finasteride caution.
- NON_SCALP_HAIR_LOSS (red_flag): hair loss from body areas other than scalp.
- INSUFFICIENT_DATA (info): questionnaire empty or incomplete — use this with low confidence as a graceful fallback.

Confidence calibration:
- 0.9 = unambiguous, classic presentation.
- 0.7 = clear with minor ambiguity.
- 0.5 = mixed signals, doctor judgment essential.
- 0.2 = should defer to doctor, insufficient data.

Forbidden behaviors:
- Never address the patient directly.
- Never give treatment recommendations or mention specific drug brands.
- Never use diagnosis-disclosure language.
- Never emit a flag code outside the list above.

Valid flag codes (exact strings):
${FLAG_CODES.map((c) => `- ${c}`).join("\n")}
`.trim();

export function buildHairLossUserPrompt(
  answers: Record<string, unknown>,
  demographics: Demographics,
): string {
  const lines: string[] = [];
  lines.push("Patient demographics:");
  lines.push(`- age: ${demographics.age}`);
  lines.push(`- sex: ${demographics.sex}`);
  lines.push("");
  lines.push(
    "Questionnaire answers (only questions the patient saw based on skip rules + sex gate are included):",
  );
  lines.push("");

  for (const [key, value] of Object.entries(answers)) {
    lines.push(`${key}: ${formatAnswer(value)}`);
  }

  return lines.join("\n");
}

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "(not answered)";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
```

- [ ] **Step 5: Run test**

```bash
pnpm test:convex -- prompts
```

Expected: 8/8 pass.

- [ ] **Step 6: Commit**

```bash
git add convex/consultations/prompts/hairLoss.ts convex/__tests__/consultations/prompts.test.ts
git commit -m "feat(phase-3c): hair-loss prompt builder + system prompt"
```

---

## Task 6: Internal queries + `upsertAssessment` mutation

**Files:**

- Create: `convex/consultations/aiAssessment.ts` (the read-side + upsert; orchestrator lands in T8)
- Test: `convex/__tests__/consultations/aiAssessment.test.ts` (start with the upsert cases)

- [ ] **Step 1: Verify `questionnaire_responses.by_consultation` index exists**

```bash
grep -A 2 "questionnaire_responses" convex/schema.ts | head -10
```

Expected: `.index("by_consultation", ["consultationId"])` from Phase 3B. If absent, stop.

- [ ] **Step 2: Write the failing test**

Create `convex/__tests__/consultations/aiAssessment.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";
// Path to modules import — confirm in Task 0 step 5; commonly:
import { modules } from "../setup";

async function seedConsultation(
  t: ReturnType<typeof convexTest>,
  opts: {
    status?: "SUBMITTED" | "AI_PROCESSING" | "AI_FAILED" | "AI_COMPLETE";
    answers?: Record<string, unknown>;
  } = {},
) {
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      phone: `+91990${Math.random().toString().slice(2, 11)}`,
    }),
  );
  const now = Date.now();
  const consultationId = await t.run((ctx) =>
    ctx.db.insert("consultations", {
      userId,
      vertical: "hair_loss",
      status: opts.status ?? "SUBMITTED",
      statusUpdatedAt: now,
      submittedAt: now,
      createdAt: now,
    }),
  );
  await t.run((ctx) =>
    ctx.db.insert("questionnaire_responses", {
      consultationId,
      userId,
      schemaVersion: "hair-loss-v1",
      answers: opts.answers ?? {
        q1_age: 32,
        q2_sex: "male",
        q3_pattern_male: ["crown", "hairline"],
      },
      completedAt: now,
    }),
  );
  return { userId, consultationId };
}

describe("aiAssessment.upsertAssessment", () => {
  const baseRow = {
    model: "claude-sonnet-4-6",
    promptVersion: "hair-loss-v1",
    narrative: "32-year-old male with classic Norwood pattern hair loss.",
    stage: { scale: "norwood" as const, value: "III", confidence: 0.85 },
    flags: [],
    confidence: 0.82,
    tokensInput: 100,
    tokensOutput: 200,
    tokensCacheRead: 50,
    costPaisa: 12,
    durationMs: 1500,
  };

  it("inserts a new row when none exists", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t, {
      status: "AI_PROCESSING",
    });

    await t.mutation(internal.consultations.aiAssessment.upsertAssessment, {
      ...baseRow,
      consultationId,
      attempt: 1,
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].attempt).toBe(1);
    expect(rows[0].narrative).toBe(baseRow.narrative);
  });

  it("overwrites the existing row on retry", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t, {
      status: "AI_PROCESSING",
    });

    await t.mutation(internal.consultations.aiAssessment.upsertAssessment, {
      ...baseRow,
      consultationId,
      attempt: 1,
    });
    await t.mutation(internal.consultations.aiAssessment.upsertAssessment, {
      ...baseRow,
      consultationId,
      attempt: 2,
      narrative: "Second attempt narrative replacing the first.",
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].attempt).toBe(2);
    expect(rows[0].narrative).toMatch(/Second attempt/);
  });

  it("preserves createdAt across overwrite", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t, {
      status: "AI_PROCESSING",
    });

    await t.mutation(internal.consultations.aiAssessment.upsertAssessment, {
      ...baseRow,
      consultationId,
      attempt: 1,
    });
    const firstCreatedAt = (await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .first(),
    ))!.createdAt;

    // Slight delay to make sure Date.now() would advance.
    await new Promise((r) => setTimeout(r, 5));

    await t.mutation(internal.consultations.aiAssessment.upsertAssessment, {
      ...baseRow,
      consultationId,
      attempt: 2,
    });

    const after = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .first(),
    );
    expect(after!.createdAt).toBe(firstCreatedAt);
  });
});
```

- [ ] **Step 3: Run test to verify failure**

```bash
pnpm test:convex -- aiAssessment.test
```

Expected: module-not-found error.

- [ ] **Step 4: Create `convex/consultations/aiAssessment.ts` with the read-side + upsert**

```ts
import { v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";

export const getConsultation = internalQuery({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, { consultationId }) => {
    const row = await ctx.db.get(consultationId);
    if (!row) {
      throw new Error(`consultation ${consultationId} not found`);
    }
    return row;
  },
});

export const getResponses = internalQuery({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, { consultationId }) => {
    const row = await ctx.db
      .query("questionnaire_responses")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", consultationId),
      )
      .unique();
    if (!row) {
      throw new Error(
        `questionnaire_responses missing for consultation ${consultationId}`,
      );
    }
    return row;
  },
});

export const upsertAssessment = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    model: v.string(),
    promptVersion: v.string(),
    attempt: v.number(),
    narrative: v.string(),
    stage: v.object({
      scale: v.union(
        v.literal("norwood"),
        v.literal("ludwig"),
        v.literal("unclassified"),
      ),
      value: v.string(),
      confidence: v.number(),
    }),
    flags: v.array(
      v.object({
        code: v.string(),
        severity: v.union(
          v.literal("info"),
          v.literal("caution"),
          v.literal("red_flag"),
        ),
        message: v.string(),
      }),
    ),
    confidence: v.number(),
    tokensInput: v.number(),
    tokensOutput: v.number(),
    tokensCacheRead: v.number(),
    costPaisa: v.number(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ai_assessments")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        // Preserve original insert timestamp on overwrite.
        createdAt: existing.createdAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("ai_assessments", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 5: Run test**

```bash
pnpm test:convex -- aiAssessment.test
```

Expected: 3/3 pass.

- [ ] **Step 6: Commit**

```bash
git add convex/consultations/aiAssessment.ts convex/__tests__/consultations/aiAssessment.test.ts
git commit -m "feat(phase-3c): internal queries + upsertAssessment mutation"
```

---

## Task 7: Core handler — `runAttempt`

**Files:**

- Modify: `convex/consultations/aiAssessment.ts` (append)

This task adds the pure handler that performs one Claude call, validates the response, and returns a discriminated union: `{ ok: true, response, tokens, durationMs } | { ok: false, failureClass, errorMessage, durationMs }`. It is exported because the live-API smoke test (Task 14) calls it directly.

- [ ] **Step 1: Append to `convex/consultations/aiAssessment.ts`**

```ts
import type { z } from "zod";

import {
  aiAssessmentResponseSchema,
  PROMPT_VERSION_HAIR_LOSS,
} from "./aiAssessmentSchema";
import {
  buildHairLossUserPrompt,
  HAIR_LOSS_SYSTEM_PROMPT,
  type Demographics,
} from "./prompts/hairLoss";
import {
  BETA_HEADER_EXTENDED_CACHE,
  computeCostPaisa,
  getAnthropicClient,
  MODEL_EXTRACTION,
  type RawClaudeResponse,
} from "../lib/claude";

const SONNET_4_6_MODEL = MODEL_EXTRACTION; // "claude-sonnet-4-6"
const MAX_TOKENS_OUTPUT = 2048;
const HARD_TIMEOUT_MS = 60_000;

export type AttemptOutcome =
  | {
      ok: true;
      response: z.infer<typeof aiAssessmentResponseSchema>;
      tokens: { input: number; output: number; cacheRead: number };
      durationMs: number;
    }
  | {
      ok: false;
      failureClass:
        | "network_timeout"
        | "rate_limit"
        | "server_error"
        | "refusal"
        | "zod_validation"
        | "parse_error"
        | "client_error";
      errorMessage: string;
      durationMs: number;
    };

export async function runAttempt(args: {
  answers: Record<string, unknown>;
  demographics: Demographics;
}): Promise<AttemptOutcome> {
  const start = Date.now();
  const client = getAnthropicClient();
  const userPrompt = buildHairLossUserPrompt(args.answers, args.demographics);

  let response: RawClaudeResponse;
  try {
    response = (await Promise.race([
      client.beta.messages.create({
        model: SONNET_4_6_MODEL,
        max_tokens: MAX_TOKENS_OUTPUT,
        system: [
          {
            type: "text",
            text: HAIR_LOSS_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral", ttl: "1h" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
        betas: [BETA_HEADER_EXTENDED_CACHE],
      } as unknown as Parameters<typeof client.beta.messages.create>[0]),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("hard_timeout_60s")),
          HARD_TIMEOUT_MS,
        ),
      ),
    ])) as unknown as RawClaudeResponse;
  } catch (e) {
    return classifyError(e, Date.now() - start);
  }

  const durationMs = Date.now() - start;

  if (response.stop_reason === "refusal") {
    return {
      ok: false,
      failureClass: "refusal",
      errorMessage: "claude returned stop_reason=refusal",
      durationMs,
    };
  }

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || !textBlock.text) {
    return {
      ok: false,
      failureClass: "parse_error",
      errorMessage: "no text block in response",
      durationMs,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (e) {
    return {
      ok: false,
      failureClass: "parse_error",
      errorMessage: `json parse failed: ${(e as Error).message}`,
      durationMs,
    };
  }

  const zodResult = aiAssessmentResponseSchema.safeParse(parsed);
  if (!zodResult.success) {
    return {
      ok: false,
      failureClass: "zod_validation",
      errorMessage: zodResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
      durationMs,
    };
  }

  return {
    ok: true,
    response: zodResult.data,
    tokens: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
    },
    durationMs,
  };
}

function classifyError(e: unknown, durationMs: number): AttemptOutcome {
  const err = e as { status?: number; message?: string };
  const message = err.message ?? String(e);
  const lower = message.toLowerCase();

  if (lower.includes("hard_timeout_60s") || lower.includes("timeout")) {
    return {
      ok: false,
      failureClass: "network_timeout",
      errorMessage: message,
      durationMs,
    };
  }
  if (err.status === 429) {
    return {
      ok: false,
      failureClass: "rate_limit",
      errorMessage: message,
      durationMs,
    };
  }
  if (err.status && err.status >= 500 && err.status < 600) {
    return {
      ok: false,
      failureClass: "server_error",
      errorMessage: message,
      durationMs,
    };
  }
  if (err.status && err.status >= 400 && err.status < 500) {
    return {
      ok: false,
      failureClass: "client_error",
      errorMessage: message,
      durationMs,
    };
  }
  // Unknown — treat as transient (retry-eligible).
  return {
    ok: false,
    failureClass: "server_error",
    errorMessage: message,
    durationMs,
  };
}

// Re-export so orchestrator + tests can read these.
export { computeCostPaisa, PROMPT_VERSION_HAIR_LOSS, SONNET_4_6_MODEL };
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm -w typecheck
```

Expected: clean. If `MODEL_EXTRACTION` import fails — verify the export name in `convex/lib/claude.ts` and adjust.

- [ ] **Step 3: Commit (no test yet — covered end-to-end in Tasks 11–13)**

```bash
git add convex/consultations/aiAssessment.ts
git commit -m "feat(phase-3c): runAttempt core handler with classify + zod validation"
```

---

## Task 8: Orchestrator actions — `kickoff` + `retry`

**Files:**

- Modify: `convex/consultations/aiAssessment.ts` (append)

- [ ] **Step 1: Append the orchestrator**

```ts
import { internal } from "../_generated/api";
import { type Id } from "../_generated/dataModel";
import { internalAction, type ActionCtx } from "../_generated/server";
import { logAiAssessmentEvent } from "../lib/telemetry";

const MAX_ATTEMPTS = 3;
const BACKOFF_MS: Record<number, number> = {
  1: 30_000,
  2: 120_000,
  3: 300_000, // unused on attempt 3 (terminal), kept for completeness
};

async function performAttempt(
  ctx: ActionCtx,
  consultationId: Id<"consultations">,
  attempt: number,
): Promise<void> {
  logAiAssessmentEvent({
    level: "info",
    event: "ai_assessment_started",
    consultationId,
    attempt,
  });

  const responses = await ctx.runQuery(
    internal.consultations.aiAssessment.getResponses,
    { consultationId },
  );

  const answers = responses.answers as Record<string, unknown>;
  const demographics: Demographics = {
    age:
      typeof answers.q1_age === "number"
        ? answers.q1_age
        : Number(answers.q1_age ?? 0),
    sex: answers.q2_sex === "female" ? "female" : "male",
  };

  const outcome = await runAttempt({ answers, demographics });

  if (outcome.ok) {
    const costPaisa = computeCostPaisa({
      tokensInput: outcome.tokens.input,
      tokensOutput: outcome.tokens.output,
      tokensCacheRead: outcome.tokens.cacheRead,
    });

    await ctx.runMutation(
      internal.consultations.aiAssessment.upsertAssessment,
      {
        consultationId,
        model: SONNET_4_6_MODEL,
        promptVersion: PROMPT_VERSION_HAIR_LOSS,
        attempt,
        narrative: outcome.response.narrative,
        stage: outcome.response.stage,
        flags: outcome.response.flags,
        confidence: outcome.response.confidence,
        tokensInput: outcome.tokens.input,
        tokensOutput: outcome.tokens.output,
        tokensCacheRead: outcome.tokens.cacheRead,
        costPaisa,
        durationMs: outcome.durationMs,
      },
    );

    await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_COMPLETE",
      kind: "system",
      reason: "ai-assessment-complete",
    });

    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_succeeded",
      consultationId,
      attempt,
      durationMs: outcome.durationMs,
      tokensInput: outcome.tokens.input,
      tokensOutput: outcome.tokens.output,
      tokensCacheRead: outcome.tokens.cacheRead,
      costPaisa,
    });
    return;
  }

  // Failure path — record AI_FAILED transition + log
  await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
    consultationId,
    toStatus: "AI_FAILED",
    kind: "system",
    reason: outcome.failureClass,
  });
  logAiAssessmentEvent({
    level: "error",
    event: "ai_assessment_failed",
    consultationId,
    attempt,
    failureClass: outcome.failureClass,
    errorMessage: outcome.errorMessage,
    durationMs: outcome.durationMs,
  });

  // Terminal classes never retry.
  const isTerminal =
    outcome.failureClass === "client_error" || attempt >= MAX_ATTEMPTS;

  if (isTerminal) {
    // Skip-AI: AI_FAILED → AI_COMPLETE (existing edge in validTransitions).
    await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_COMPLETE",
      kind: "system",
      reason: "ai-assessment-skipped-after-failures",
    });
    logAiAssessmentEvent({
      level: "warn",
      event: "ai_assessment_terminal_skip",
      consultationId,
      totalAttempts: attempt,
    });
    return;
  }

  // Otherwise schedule the next retry.
  await ctx.scheduler.runAfter(
    BACKOFF_MS[attempt],
    internal.consultations.aiAssessment.retry,
    { consultationId, attempt: attempt + 1 },
  );
}

export const kickoff = internalAction({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, { consultationId }) => {
    await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      reason: "ai-assessment-start",
    });
    await performAttempt(ctx, consultationId, 1);
  },
});

export const retry = internalAction({
  args: {
    consultationId: v.id("consultations"),
    attempt: v.number(),
  },
  handler: async (ctx, { consultationId, attempt }) => {
    await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      reason: "ai-assessment-retry",
    });
    await performAttempt(ctx, consultationId, attempt);
  },
});
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm -w typecheck
```

Expected: clean. If `ActionCtx` import fails, the correct generic-typed import alternative is `import type { ActionCtx } from "../_generated/server"` — verify against `_generated/server.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add convex/consultations/aiAssessment.ts
git commit -m "feat(phase-3c): kickoff + retry orchestrator with backoff schedule"
```

---

## Task 9: Wire `submitConsultation` to schedule the new action

**Files:**

- Modify: `convex/consultations/submitConsultation.ts:89-93`

- [ ] **Step 1: Make the one-line change**

Edit the file. Replace the schedule call:

```diff
-    await ctx.scheduler.runAfter(
-      0,
-      internal.consultations.aiStub.kickoffAiStub,
-      { consultationId: args.consultationId },
-    );
+    await ctx.scheduler.runAfter(
+      0,
+      internal.consultations.aiAssessment.kickoff,
+      { consultationId: args.consultationId },
+    );
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm -w typecheck
```

Expected: clean.

- [ ] **Step 3: Run convex tests**

```bash
pnpm test:convex
```

Expected: all prior tests still pass. The Phase 3B `submitConsultation.test.ts` may assert that `internal.consultations.aiStub.kickoffAiStub` is scheduled — if that test fails with the new ref, update it inline to assert `internal.consultations.aiAssessment.kickoff`. Do not skip the test.

- [ ] **Step 4: Commit**

```bash
git add convex/consultations/submitConsultation.ts convex/__tests__/consultations/submitConsultation.test.ts
git commit -m "feat(phase-3c): submitConsultation schedules aiAssessment.kickoff"
```

(Only include `submitConsultation.test.ts` in the add if you actually had to edit it.)

---

## Task 10: Delete `aiStub.ts`

**Files:**

- Delete: `convex/consultations/aiStub.ts`

- [ ] **Step 1: Reverify zero callers**

```bash
grep -rn "aiStub\|kickoffAiStub" --include="*.ts" --include="*.tsx" .
```

Expected: matches only inside `convex/consultations/aiStub.ts` itself. Anything else means a dependency was missed in Task 9 — fix before deleting.

- [ ] **Step 2: Delete + verify**

```bash
git rm convex/consultations/aiStub.ts
pnpm -w typecheck
pnpm test:convex
```

Expected: clean across the board.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(phase-3c): delete aiStub.ts (replaced by aiAssessment)"
```

---

## Task 11: Mocked vitest — happy path

**Files:**

- Modify: `convex/__tests__/consultations/aiAssessment.test.ts`

This task adds the orchestrator-level happy path test to the same file. Subsequent tasks add failure-path cases.

- [ ] **Step 1: Append to the test file**

Add at the bottom (after the `upsertAssessment` describe block):

```ts
import { vi } from "vitest";
import * as claudeLib from "../../lib/claude";

vi.mock("../../lib/claude", async () => {
  const actual = await vi.importActual<typeof claudeLib>("../../lib/claude");
  return {
    ...actual,
    getAnthropicClient: vi.fn(),
  };
});

const validResponse = {
  narrative:
    "32-year-old male with classic Norwood pattern hair loss with strong family history.",
  stage: { scale: "norwood", value: "III", confidence: 0.85 },
  flags: [
    {
      code: "FINASTERIDE_CAUTION_UNDER_25",
      severity: "caution",
      message: "Patient under 25; counsel re: finasteride.",
    },
  ],
  confidence: 0.82,
};

function mockClaudeSuccess(payload: unknown = validResponse) {
  vi.mocked(claudeLib.getAnthropicClient).mockReturnValue({
    beta: {
      messages: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify(payload) }],
          usage: {
            input_tokens: 5000,
            output_tokens: 800,
            cache_read_input_tokens: 3500,
          },
        }),
      },
    },
  } as unknown as ReturnType<typeof claudeLib.getAnthropicClient>);
}

describe("aiAssessment.kickoff (happy path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ends in AI_COMPLETE with one ai_assessments row", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);
    mockClaudeSuccess();

    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });

    const consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_COMPLETE");

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].attempt).toBe(1);
    expect(rows[0].model).toBe("claude-sonnet-4-6");
    expect(rows[0].promptVersion).toBe("hair-loss-v1");
    expect(rows[0].costPaisa).toBeGreaterThan(0);
    expect(Number.isInteger(rows[0].costPaisa)).toBe(true);

    const history = await t.run((ctx) =>
      ctx.db
        .query("consultation_status_history")
        .filter((q) => q.eq(q.field("consultationId"), consultationId))
        .collect(),
    );
    // Expect: SUBMITTED → AI_PROCESSING + AI_PROCESSING → AI_COMPLETE
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.every((h) => h.kind === "system")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm test:convex -- aiAssessment.test
```

Expected: 4/4 pass (3 from Task 6 + 1 here).

- [ ] **Step 3: Commit**

```bash
git add convex/__tests__/consultations/aiAssessment.test.ts
git commit -m "test(phase-3c): mocked happy-path test for kickoff"
```

---

## Task 12: Mocked vitest — failure paths (zod, refusal, client_error, retry-then-success)

**Files:**

- Modify: `convex/__tests__/consultations/aiAssessment.test.ts`

The convex-test surface in this codebase does NOT expose a scheduler-flush helper. To test multi-attempt retry chains we invoke `kickoff` (attempt 1) directly, then invoke `retry` (attempt 2) directly to simulate the scheduler firing the next callback. This isolates the orchestrator's per-attempt logic without depending on test-runtime scheduler internals.

- [ ] **Step 1: Append the failure cases**

```ts
function mockClaudeFailure(opts: { status?: number; message?: string } = {}) {
  vi.mocked(claudeLib.getAnthropicClient).mockReturnValue({
    beta: {
      messages: {
        create: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error(opts.message ?? "boom"), {
              status: opts.status,
            }),
          ),
      },
    },
  } as unknown as ReturnType<typeof claudeLib.getAnthropicClient>);
}

function mockClaudeRefusal() {
  vi.mocked(claudeLib.getAnthropicClient).mockReturnValue({
    beta: {
      messages: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "refusal",
          content: [{ type: "text", text: "" }],
          usage: {
            input_tokens: 1,
            output_tokens: 0,
            cache_read_input_tokens: 0,
          },
        }),
      },
    },
  } as unknown as ReturnType<typeof claudeLib.getAnthropicClient>);
}

function mockClaudeMalformedJson() {
  vi.mocked(claudeLib.getAnthropicClient).mockReturnValue({
    beta: {
      messages: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "end_turn",
          content: [{ type: "text", text: '{"this":"is missing keys"}' }],
          usage: {
            input_tokens: 1,
            output_tokens: 1,
            cache_read_input_tokens: 0,
          },
        }),
      },
    },
  } as unknown as ReturnType<typeof claudeLib.getAnthropicClient>);
}

describe("aiAssessment.kickoff (failure paths)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("zod validation fail: status ends AI_FAILED, no row written, retry scheduled", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);
    mockClaudeMalformedJson();

    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });

    const consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  it("refusal classified separately and ends AI_FAILED", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);
    mockClaudeRefusal();

    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });

    const consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");
  });

  it("client_error (401): skip-AI on attempt 1, no retry, status=AI_COMPLETE, no row", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);
    mockClaudeFailure({ status: 401, message: "unauthorized" });

    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });

    const consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_COMPLETE");

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  it("retry-then-success: attempt 1 fails (5xx), attempt 2 succeeds — row written with attempt=2", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);

    mockClaudeFailure({ status: 503, message: "service unavailable" });
    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });

    let consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");

    mockClaudeSuccess();
    await t.action(internal.consultations.aiAssessment.retry, {
      consultationId,
      attempt: 2,
    });

    consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_COMPLETE");

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].attempt).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm test:convex -- aiAssessment.test
```

Expected: 8/8 pass (4 prior + 4 new).

- [ ] **Step 3: Commit**

```bash
git add convex/__tests__/consultations/aiAssessment.test.ts
git commit -m "test(phase-3c): mocked failure-path tests (zod / refusal / client_error / retry)"
```

---

## Task 13: Mocked vitest — triple-failure skip-AI + idempotency + empty-questionnaire

**Files:**

- Modify: `convex/__tests__/consultations/aiAssessment.test.ts`

- [ ] **Step 1: Append the cases**

```ts
describe("aiAssessment skip-AI + edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triple failure: status=AI_COMPLETE, no row, status_history shows kind=system terminal-skip", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);
    mockClaudeFailure({ status: 503, message: "service unavailable" });

    // Attempt 1 (kickoff) — fails, schedules retry attempt 2
    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });
    let consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");

    // Attempt 2 — fails, schedules retry attempt 3
    await t.action(internal.consultations.aiAssessment.retry, {
      consultationId,
      attempt: 2,
    });
    consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");

    // Attempt 3 — fails, terminal-skips to AI_COMPLETE
    await t.action(internal.consultations.aiAssessment.retry, {
      consultationId,
      attempt: 3,
    });
    consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_COMPLETE");

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(0);

    const history = await t.run((ctx) =>
      ctx.db
        .query("consultation_status_history")
        .filter((q) => q.eq(q.field("consultationId"), consultationId))
        .collect(),
    );
    // Expected: 3× AI_PROCESSING + 3× AI_FAILED + 1× AI_COMPLETE = 7 rows
    expect(history.length).toBe(7);
    expect(history.every((h) => h.kind === "system")).toBe(true);
    const lastRow = history.sort((a, b) => a.changedAt - b.changedAt).at(-1)!;
    expect(lastRow.toStatus).toBe("AI_COMPLETE");
    expect(lastRow.reason).toBe("ai-assessment-skipped-after-failures");
  });

  it("idempotency: kickoff on already-AI_COMPLETE rejects (transitionStatus invalid)", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t, {
      status: "AI_COMPLETE",
    });
    mockClaudeSuccess();

    await expect(
      t.action(internal.consultations.aiAssessment.kickoff, { consultationId }),
    ).rejects.toThrow(/invalid transition|terminal/i);

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(0);
  });

  it("empty questionnaire: orchestrator still runs; INSUFFICIENT_DATA flag respected", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t, {
      answers: { q1_age: 32, q2_sex: "male" },
    });
    mockClaudeSuccess({
      narrative:
        "Insufficient questionnaire data; doctor review required for full assessment.",
      stage: { scale: "unclassified", value: "unknown", confidence: 0.1 },
      flags: [
        {
          code: "INSUFFICIENT_DATA",
          severity: "info",
          message: "Questionnaire missing key clinical fields.",
        },
      ],
      confidence: 0.1,
    });

    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });

    const rows = await t.run((ctx) =>
      ctx.db
        .query("ai_assessments")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].flags[0]!.code).toBe("INSUFFICIENT_DATA");
    expect(rows[0].confidence).toBeLessThan(0.3);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm test:convex -- aiAssessment.test
```

Expected: 11/11 pass.

- [ ] **Step 3: Run full convex suite**

```bash
pnpm test:convex
```

Expected: 250 (baseline) + 10 (T2) + 5 (T3) + 5 (T4) + 8 (T5) + 11 (T6/T11/T12/T13) = ~289 / 1 skipped. Adjust if any task added different counts than estimated.

- [ ] **Step 4: Commit**

```bash
git add convex/__tests__/consultations/aiAssessment.test.ts
git commit -m "test(phase-3c): triple-fail skip-AI + idempotency + empty-questionnaire"
```

---

## Task 14: Live-API smoke fixtures + npm script

**Files:**

- Create: `convex/__tests__/fixtures/aiAssessment/{male-aga,female-aga,scarring}.json`
- Create: `convex/__tests__/test-claude/aiAssessment.test.ts`
- Modify: root `package.json`

- [ ] **Step 1: Create `male-aga.json`**

```json
{
  "demographics": { "age": 32, "sex": "male" },
  "answers": {
    "q1_age": 32,
    "q2_sex": "male",
    "q3_pattern_male": ["crown", "hairline"],
    "q4_age_of_onset": 27,
    "q5_family_history": "Maternal grandfather and father — both Norwood IV+",
    "q6_family_age_onset": "Father started losing hair around age 30",
    "q7_telogen_triggers": "None",
    "q8_medical_history": "None significant",
    "q9_current_medications": "None",
    "q10_allergies": "None",
    "q11_duration": "5 years, gradual progression",
    "q12_self_severity": "Moderate",
    "q13_progression": "Active progression",
    "q14_scalp_symptoms": "None",
    "q15_shedding_pattern": "Thinning with miniaturization",
    "q16_hair_quality": "Thinner, finer at affected areas",
    "q17_non_scalp_loss": "No",
    "q18_stress": "Moderate",
    "q19_diet": "Mixed, regular",
    "q20_sleep": "7 hours",
    "q21_smoking": "No",
    "q22_morning_erections": "Daily",
    "q23_libido": "Normal",
    "q24_concern_finasteride": "Somewhat concerned",
    "q25_partner_pregnancy": "Not applicable",
    "q26_prior_treatments": "None",
    "q27_treatment_response": "N/A",
    "q28_treatment_goals": "Slow further hair loss"
  },
  "expectations": {
    "stage_scale": "norwood",
    "stage_value_pattern": "^(III|IV)",
    "must_not_contain_red_flag": true,
    "min_overall_confidence": 0.5
  }
}
```

- [ ] **Step 2: Create `female-aga.json`**

```json
{
  "demographics": { "age": 38, "sex": "female" },
  "answers": {
    "q1_age": 38,
    "q2_sex": "female",
    "q3_pattern_female": "Widening part, diffuse thinning at crown",
    "q4_age_of_onset": 35,
    "q5_family_history": "Mother and maternal aunt — Ludwig II",
    "q6_family_age_onset": "Mother around age 40",
    "q7_telogen_triggers": "Pregnancy 18 months ago",
    "q8_medical_history": "PCOS diagnosed 2018",
    "q9_current_medications": "None",
    "q10_allergies": "None",
    "q11_duration": "3 years, gradual",
    "q12_self_severity": "Moderate",
    "q13_progression": "Stable last 6 months",
    "q14_scalp_symptoms": "None",
    "q15_shedding_pattern": "Diffuse thinning at part",
    "q16_hair_quality": "Finer at the part line",
    "q17_non_scalp_loss": "No",
    "q18_stress": "Moderate",
    "q19_diet": "Mixed, mostly vegetarian",
    "q20_sleep": "6 hours",
    "q21_smoking": "No",
    "q26_prior_treatments": "Topical minoxidil 6 months, mild improvement",
    "q27_treatment_response": "Mild improvement",
    "q28_treatment_goals": "Restore part density"
  },
  "expectations": {
    "stage_scale": "ludwig",
    "must_contain_flag_code": "FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING",
    "min_overall_confidence": 0.4
  }
}
```

- [ ] **Step 3: Create `scarring.json`**

```json
{
  "demographics": { "age": 45, "sex": "male" },
  "answers": {
    "q1_age": 45,
    "q2_sex": "male",
    "q3_pattern_male": ["specific patches"],
    "q4_age_of_onset": 45,
    "q5_family_history": "None",
    "q7_telogen_triggers": "None",
    "q8_medical_history": "None",
    "q9_current_medications": "None",
    "q11_duration": "2 months, sudden onset",
    "q12_self_severity": "Severe in patch",
    "q13_progression": "Active progression",
    "q14_scalp_symptoms": "Pain, redness, bumps in patch area",
    "q15_shedding_pattern": "Sudden patch loss",
    "q16_hair_quality": "Normal outside patch",
    "q17_non_scalp_loss": "No"
  },
  "expectations": {
    "stage_scale_in": ["unclassified", "norwood"],
    "must_contain_flag_code": "SCARRING_ALOPECIA_SUSPECT",
    "min_overall_confidence": 0.5
  }
}
```

- [ ] **Step 4: Create the live-API test**

`convex/__tests__/test-claude/aiAssessment.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAttempt } from "../../consultations/aiAssessment";

const FIXTURE_DIR = join(__dirname, "..", "fixtures", "aiAssessment");
const RUN_LIVE = !!process.env.ANTHROPIC_API_KEY;
const maybe = RUN_LIVE ? describe : describe.skip;

type Fixture = {
  demographics: { age: number; sex: "male" | "female" };
  answers: Record<string, unknown>;
  expectations: {
    stage_scale?: string;
    stage_scale_in?: string[];
    stage_value_pattern?: string;
    must_contain_flag_code?: string;
    must_not_contain_red_flag?: boolean;
    min_overall_confidence?: number;
  };
};

function loadFixture(name: string): Fixture {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf8"));
}

maybe("aiAssessment live-API smoke", () => {
  it("male-aga: classic Norwood pattern, no red flags", async () => {
    const f = loadFixture("male-aga");
    const out = await runAttempt({
      answers: f.answers,
      demographics: f.demographics,
    });
    if (!out.ok) {
      throw new Error(
        `unexpected failure: ${out.failureClass} — ${out.errorMessage}`,
      );
    }

    expect(out.response.stage.scale).toBe(f.expectations.stage_scale);
    if (f.expectations.stage_value_pattern) {
      expect(out.response.stage.value).toMatch(
        new RegExp(f.expectations.stage_value_pattern),
      );
    }
    if (f.expectations.must_not_contain_red_flag) {
      expect(
        out.response.flags.some((flag) => flag.severity === "red_flag"),
      ).toBe(false);
    }
    if (f.expectations.min_overall_confidence !== undefined) {
      expect(out.response.confidence).toBeGreaterThanOrEqual(
        f.expectations.min_overall_confidence,
      );
    }
  }, 90_000);

  it("female-aga: Ludwig + finasteride contraindication red flag", async () => {
    const f = loadFixture("female-aga");
    const out = await runAttempt({
      answers: f.answers,
      demographics: f.demographics,
    });
    if (!out.ok) {
      throw new Error(
        `unexpected failure: ${out.failureClass} — ${out.errorMessage}`,
      );
    }

    expect(out.response.stage.scale).toBe("ludwig");
    expect(out.response.flags.map((flag) => flag.code)).toContain(
      "FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING",
    );
    expect(out.response.confidence).toBeGreaterThanOrEqual(
      f.expectations.min_overall_confidence!,
    );
  }, 90_000);

  it("scarring: SCARRING_ALOPECIA_SUSPECT red flag, scale unclassified or norwood", async () => {
    const f = loadFixture("scarring");
    const out = await runAttempt({
      answers: f.answers,
      demographics: f.demographics,
    });
    if (!out.ok) {
      throw new Error(
        `unexpected failure: ${out.failureClass} — ${out.errorMessage}`,
      );
    }

    expect(out.response.flags.map((flag) => flag.code)).toContain(
      "SCARRING_ALOPECIA_SUSPECT",
    );
    expect(["unclassified", "norwood"]).toContain(out.response.stage.scale);
  }, 90_000);
});
```

- [ ] **Step 5: Add the npm script to root `package.json`**

```diff
   "scripts": {
+    "test:claude:ai": "pnpm vitest run convex/__tests__/test-claude/aiAssessment.test.ts --no-isolate",
```

- [ ] **Step 6: Run with `ANTHROPIC_API_KEY` set**

```bash
ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY' .env.local | cut -d= -f2-) pnpm test:claude:ai
```

Expected: 3/3 pass in ~30–60 seconds. Per-fixture cost ≤ ₹1; total ≤ ₹3 for one run.

If any case fails on a soft assertion (`min_overall_confidence`, `stage_value_pattern`), do NOT widen the assertion silently. Investigate first — fixtures are tuned to be unambiguous and a fail likely means the system prompt drifted.

- [ ] **Step 7: Run with no key — assert clean skip**

```bash
unset ANTHROPIC_API_KEY
pnpm test:claude:ai
```

Expected: `3 skipped`.

- [ ] **Step 8: Commit**

```bash
git add convex/__tests__/test-claude/aiAssessment.test.ts convex/__tests__/fixtures/aiAssessment/ package.json
git commit -m "test(phase-3c): 3-fixture live-API smoke under pnpm test:claude:ai"
```

---

## Task 15: Disclosure copy on confirmation screen

**Files:**

- Modify: `apps/mobile/app/treatment/confirmation.tsx`
- Create: `apps/mobile/__tests__/screens/treatment/confirmation-disclosure.test.tsx`

The disclosure line lands on the existing post-submit confirmation screen (`/treatment/confirmation`). No new route is created.

- [ ] **Step 1: Re-read the existing screen**

```bash
sed -n '60,80p' apps/mobile/app/treatment/confirmation.tsx
```

Find the existing copy block "Our AI is preparing your case for the doctor — usually under a minute. A doctor will then review within 24 hours, completely free. We'll notify you when your plan is ready."

The disclosure phrase ("All medical decisions are made by your doctor.") gets folded into the existing paragraph rather than added as a sibling — the existing copy already discloses AI involvement; this change adds the medical-decisions clause.

- [ ] **Step 2: Write the failing test**

Create `apps/mobile/__tests__/screens/treatment/confirmation-disclosure.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

const Confirmation = require("../../../app/treatment/confirmation").default;

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

describe("Confirmation screen — AI disclosure", () => {
  it("renders the medical-decisions disclosure clause", () => {
    const { getByText } = render(
      <TestProvider scenario="reviewing">
        <Confirmation />
      </TestProvider>,
    );
    expect(
      getByText(/All medical decisions are made by your doctor/),
    ).toBeTruthy();
  });

  it("never leaks raw AI output (no Norwood, no Ludwig, no flag codes)", () => {
    const { queryByText } = render(
      <TestProvider scenario="reviewing">
        <Confirmation />
      </TestProvider>,
    );
    expect(queryByText(/Norwood/)).toBeNull();
    expect(queryByText(/Ludwig/)).toBeNull();
    expect(queryByText(/FINASTERIDE/)).toBeNull();
    expect(queryByText(/SCARRING/)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify failure**

```bash
pnpm --filter @onlyou/mobile test -- confirmation-disclosure
```

Expected: "All medical decisions are made by your doctor" not found.

- [ ] **Step 4: Modify `apps/mobile/app/treatment/confirmation.tsx`**

Find the existing paragraph:

```tsx
<Text
  style={{
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 16,
  }}
>
  Our AI is preparing your case for the doctor — usually under a minute. A
  doctor will then review within 24 hours, completely free. We&apos;ll notify
  you when your plan is ready.
</Text>
```

Replace its inner text with:

```tsx
  Our AI is preparing your case for the doctor — usually under a minute.
  All medical decisions are made by your doctor, who will review within 24
  hours, completely free. We&apos;ll notify you when your plan is ready.
```

- [ ] **Step 5: Re-run the disclosure test**

```bash
pnpm --filter @onlyou/mobile test -- confirmation-disclosure
```

Expected: 2/2 pass.

- [ ] **Step 6: Run the full mobile suite + the existing confirmation test**

```bash
pnpm --filter @onlyou/mobile test -- confirmation
```

Expected: existing `confirmation.test.tsx` may fail because it asserts the exact prior copy `/A doctor will then review within 24 hours/`. The new copy still contains "doctor will review within 24 hours" so the regex should still match — verify; if it fails, update the regex inline:

```diff
-    expect(getByText(/A doctor will then review within 24 hours/)).toBeTruthy();
+    expect(getByText(/doctor.*review within 24 hours/)).toBeTruthy();
```

- [ ] **Step 7: Run full mobile suite + typecheck**

```bash
pnpm --filter @onlyou/mobile typecheck
pnpm --filter @onlyou/mobile test
```

Expected: 260 (baseline) + 2 = 262/262 pass; typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/treatment/confirmation.tsx apps/mobile/__tests__/screens/treatment/
git commit -m "feat(phase-3c): AI disclosure clause on confirmation screen"
```

---

## Task 16: Live E2E on physical Android device

**Files:** verification only.

Per CLAUDE.md rule 5 + spec §8 acceptance gate.

- [ ] **Step 1: Set the Anthropic key on the dev Convex deployment**

```bash
cd /d/onlyou2-phase-3c
npx convex env set ANTHROPIC_API_KEY "$(grep '^ANTHROPIC_API_KEY' .env.local | cut -d= -f2-)"
npx convex env list
```

Expected: `ANTHROPIC_API_KEY` listed.

- [ ] **Step 2: Start `convex dev`**

```bash
npx convex dev
```

Leave running.

- [ ] **Step 3: Start Expo on a physical Android device**

In a second terminal:

```bash
pnpm --filter @onlyou/mobile start
```

Connect the device + open the app.

- [ ] **Step 4: Run the full intake**

- Sign in (phone OTP — social-auth is TEMP-disabled in Expo Go per `a13baa3`).
- Pick "Hair Loss".
- Complete the 28-question questionnaire.
- Upload 4 real photos.
- Submit.

- [ ] **Step 5: Observe the patient experience**

Expected:

- Confirmation screen renders with the new disclosure clause "All medical decisions are made by your doctor".
- Within ~10–30 seconds the home banner shifts to "Thanks for submitting" / "Your case is in review."
- No raw AI output anywhere on the device.

- [ ] **Step 6: Observe Convex dashboard**

Open the Convex dashboard for deployment `aromatic-labrador-938`:

- `consultations` row went `SUBMITTED → AI_PROCESSING → AI_COMPLETE`.
- `ai_assessments` row exists for that `consultationId` with non-empty `narrative`, valid `stage` (norwood / ludwig / unclassified), one or more entries in `flags`, `confidence` between 0 and 1.
- `costPaisa` < 200 (₹2 cap). Cold cache run might be ~₹1.50; warm cache ~₹0.50.
- `consultation_status_history` has 2 system rows for AI processing + complete.

- [ ] **Step 7: Capture artifacts**

Save under `docs/superpowers/phases/3c/e2e/`:

- Screenshot of the confirmation screen (showing disclosure copy).
- Screenshot of the home "in review" banner.
- Redacted screenshot of the Convex dashboard `ai_assessments` row (consultation id visible, narrative readable enough to verify it's coherent).
- Plain-text summary file `summary.md`: consultation id, durationMs, costPaisa, model, narrative, stage scale + value, flag codes emitted.

- [ ] **Step 8: Commit the artifacts**

```bash
git add docs/superpowers/phases/3c/e2e/
git commit -m "docs(phase-3c): live Android E2E artifacts (consultation <id>, cost ₹<X>)"
```

If `costPaisa` exceeds ₹2 — investigate. Likely cause: cold-cache cost on first ever call to Claude with the system prompt. Re-run the E2E once and check whether the second run is < ₹1 (cache warm) before proceeding.

---

## Task 17: Phase code review + DEFERRED strike + checkpoint update

**Files:**

- Create: `docs/superpowers/reviews/2026-04-25-phase-3c-ai-pre-assessment-review.md`
- Modify: `docs/DEFERRED.md`
- Modify: `checkpoint.md`

- [ ] **Step 1: Run the code-reviewer**

Either dispatch the `superpowers:code-reviewer` agent on the phase-3c diff, or invoke the `superpowers:requesting-code-review` skill. Output destination: `docs/superpowers/reviews/2026-04-25-phase-3c-ai-pre-assessment-review.md`.

- [ ] **Step 2: Address findings**

For each Critical or Important finding: fix in a new commit and reference the finding id in the commit message. For each finding deliberately deferred: add an entry to `docs/DEFERRED.md` under a new heading:

```markdown
**Phase 3C post-review deferrals (2026-04-25, code-reviewer findings):**

- **<title>** (<finding-id> from review). <symptom + reasoning>. **Why:** <why deferred>. **How to apply:** <fix recipe>. → **Phase X**.
```

- [ ] **Step 3: Strike DEFERRED line 297**

Edit `docs/DEFERRED.md`. The line currently reads:

> **AI pre-assessment upgrade B → C** — Phase 3C ships option B ... → Phase 8 (launch polish) or earlier ...

Apply strike-through markup to the B-portion only (the C-upgrade deferral remains active). Example diff:

```diff
- | **AI pre-assessment upgrade B → C** — Phase 3C ships option **B** (questionnaire-only ...
+ | ~~**AI pre-assessment upgrade B → C**~~ — ~~Phase 3C ships option **B** (questionnaire-only ...~~ **✓ B SHIPPED phase-3c (commit <hash>)** — C upgrade still deferred to Phase 8.
```

- [ ] **Step 4: Update `checkpoint.md`**

Insert a new section at the top of `checkpoint.md`:

```markdown
## Phase 3C — code-complete, ready to merge (2026-04-25)

Branch `phase-3c`, <N> commits ahead of master. Live E2E PASS on physical Android (consultation `<id>`, cost ₹<X>).

**Tests at session end:**

- pnpm test:convex: ~289 / 1 skipped
- pnpm test:claude:ai: 3/3 pass
- pnpm --filter @onlyou/mobile test: 262/262
- pnpm -w typecheck + lint: clean

**Phase code-review verdict:** APPROVED*WITH*<verdict>. <N> Critical fixed pre-merge. <N> Important / <N> Minor logged in DEFERRED.md.

**DEFERRED strikes:** line 297 (AI Option B portion shipped; C upgrade still queued for Phase 8).

**Awaiting founder action:** approve merge.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reviews/ docs/DEFERRED.md checkpoint.md
git commit -m "docs(phase-3c): code review + DEFERRED strikes + checkpoint update"
```

---

## Task 18: Merge to master + worktree cleanup + memory file

**Files:** git operations + memory file.

Only run after the founder approves the merge.

- [ ] **Step 1: From the master worktree, merge phase-3c**

```bash
cd /d/onlyou2
git checkout master
git pull origin master
git merge --no-ff phase-3c -m "Merge phase-3c: AI pre-assessment (Option B)"
```

- [ ] **Step 2: Re-verify on master**

```bash
pnpm install
pnpm -w typecheck
pnpm -w lint
pnpm test:convex
pnpm --filter @onlyou/mobile test
```

Expected: all green. If any fail, abort merge (`git reset --hard ORIG_HEAD`) and investigate.

- [ ] **Step 3: Push**

```bash
git push origin master
```

- [ ] **Step 4: Clean up branch + worktree**

```bash
git worktree remove ../onlyou2-phase-3c
git branch -D phase-3c
```

(Per memory `project_phase_3b_complete.md` — physical worktree dir on Windows may persist if files are locked; safe to `rm -rf` after closing editors.)

- [ ] **Step 5: Write memory file**

`C:/Users/vabhi/.claude/projects/D--onlyou2/memory/project_phase_3c_complete.md`:

```markdown
---
name: Phase 3C merged YYYY-MM-DD
description: AI pre-assessment Option B shipped at <commit>; Phase 3D (doctor sim) queued next
type: project
---

Phase 3C merged to master at `<commit>` on YYYY-MM-DD. Delivers: real Sonnet 4.6 action replacing aiStub, ai_assessments table 1:1 with consultations, 12-flag vocabulary, 3-attempt retry → skip-AI via existing AI_FAILED → AI_COMPLETE edge, AI disclosure clause on confirmation screen.

**Why:** Option B locked in decision register D2; Option C (vision over photos) deferred to Phase 8.

**How to apply:** Phase 3D treats ai_assessments rows as immutable inputs. Doctor sim must handle the empty-row case (skip-AI path produces status=AI_COMPLETE with no row).
```

- [ ] **Step 6: Update MEMORY.md index**

`C:/Users/vabhi/.claude/projects/D--onlyou2/memory/MEMORY.md` — add a line:

```markdown
- [Phase 3C merged YYYY-MM-DD](project_phase_3c_complete.md) — AI pre-assessment Option B shipped at <commit>; Phase 3D (doctor sim) queued next
```

---

## Self-Review

**Spec coverage** — every in-scope item in spec §2 maps to a task:

1. `ai_assessments` table → T1
2. `aiAssessment.ts` orchestrator → T6/T7/T8
3. zod schema + flag vocab → T2
4. hair-loss prompt builder → T5
5. retry policy → T8
6. skip-AI escape hatch → T8 + T13 test
7. disclosure copy → T15
8. mocked vitest suite → T6/T11/T12/T13
9. live-API smoke → T14
10. telemetry → T4
11. cost logging → T3 + T8 (writes `costPaisa` to row)
12. prompt versioning → T2 const + T8 stamps onto row

**Spec acceptance gates §8** — addressed:

- §8.1 mocked tests in CI → T11/T12/T13 (all CI-mandatory)
- §8.2 manual `pnpm test:claude:ai` → T14
- §8.3 typecheck + lint → T1 / T15 / T18
- §8.4 code review → T17
- §8.5 live Android E2E + observable status flow → T16
- §8.6 founder visual approval → covered by T16 step 7 capture
- §8.7 cost-cap < ₹2 → T16 step 6
- §8.8 DEFERRED line 297 strike → T17

**Placeholder scan** — every step has either a complete code block or an exact command. No "TBD" / "TODO" / "implement later".

**Type / name consistency:**

- `runAttempt`, `kickoff`, `retry`, `upsertAssessment`, `getConsultation`, `getResponses` — same names everywhere they appear.
- `Demographics` type defined T5, used T7 and T8.
- `MAX_ATTEMPTS = 3` defined T8 only.
- `SONNET_4_6_MODEL` re-exported from `aiAssessment.ts` T7, used in T8 row write.
- `seedConsultation` test helper introduced T6, reused T11/T12/T13.
- Schema field names (`userId`, `submittedAt`, `completedAt`) match real schema verified in T0.

**Spec gaps:** spec §9 lists 3 open questions for the planner — answered:

- Path to confirmation screen → verified T0 step 8 = `apps/mobile/app/treatment/confirmation.tsx`. Disclosure clause folds into existing copy block (T15) rather than a new paragraph.
- `attempt` field semantics → "successful-attempt index" — codified in T8 row write (`attempt` argument is the in-progress attempt count when the call succeeded).
- Cost rate constants → placed in `convex/lib/claude.ts` (T3) not in the assessment code, as specified.

---

## Plan complete.

**Spec:** `docs/superpowers/specs/2026-04-25-phase-3c-ai-pre-assessment-design.md`.
**Decision register:** `docs/decisions/2026-04-24-phase-3-decomposition.md` D2.
**Skip-AI design choice:** `docs/decisions/2026-04-25-phase-3c-skip-ai-via-existing-edge.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task with two-stage review. Best for an 18-task plan; each task is self-contained with its own commit.
2. **Inline Execution** — execute tasks in this session in batches with checkpoints between them.

Which approach?
