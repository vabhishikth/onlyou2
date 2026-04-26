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
