import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

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
