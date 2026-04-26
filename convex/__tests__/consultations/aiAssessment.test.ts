import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { internal } from "../../_generated/api";
import * as claudeLib from "../../lib/claude";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

vi.mock("../../lib/claude", async () => {
  const actual = await vi.importActual<typeof claudeLib>("../../lib/claude");
  return {
    ...actual,
    getAnthropicClient: vi.fn(),
  };
});

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
      role: "PATIENT",
      phoneVerified: false,
      profileComplete: false,
      createdAt: Date.now(),
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

function mockClaudeFailure(opts: { status?: number; message?: string } = {}) {
  vi.mocked(claudeLib.getAnthropicClient).mockReturnValue({
    beta: {
      messages: {
        create: vi.fn().mockRejectedValue(
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
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.every((h) => h.kind === "system")).toBe(true);
  });
});

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

describe("aiAssessment skip-AI + edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triple failure: status=AI_COMPLETE, no row, status_history shows kind=system terminal-skip", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seedConsultation(t);
    mockClaudeFailure({ status: 503, message: "service unavailable" });

    await t.action(internal.consultations.aiAssessment.kickoff, {
      consultationId,
    });
    let consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");

    await t.action(internal.consultations.aiAssessment.retry, {
      consultationId,
      attempt: 2,
    });
    consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_FAILED");

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
