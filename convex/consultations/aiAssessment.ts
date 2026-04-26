import { v } from "convex/values";
import type { z } from "zod";

import { internalMutation, internalQuery } from "../_generated/server";
import {
  BETA_HEADER_EXTENDED_CACHE,
  computeCostPaisa,
  getAnthropicClient,
  MODEL_EXTRACTION,
  type RawClaudeResponse,
} from "../lib/claude";

import {
  aiAssessmentResponseSchema,
  PROMPT_VERSION_HAIR_LOSS,
} from "./aiAssessmentSchema";
import {
  buildHairLossUserPrompt,
  HAIR_LOSS_SYSTEM_PROMPT,
  type Demographics,
} from "./prompts/hairLoss";

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

// ---------- runAttempt ----------

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
