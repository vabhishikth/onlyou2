import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { PHOTO_SLOTS, REQUIRED_PHOTO_COUNT } from "../lib/photoSlot";

import { verticalValidator } from "./schema";

export const startConsultation = mutation({
  args: { token: v.string(), vertical: verticalValidator },
  handler: async (ctx, { token, vertical }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const now = Date.now();
    const consultationId = await ctx.db.insert("consultations", {
      userId: session.userId,
      vertical,
      status: "SUBMITTED",
      statusUpdatedAt: now,
      submittedAt: now,
      createdAt: now,
    });
    return { consultationId };
  },
});

export const submitConsultation = mutation({
  args: {
    token: v.string(),
    consultationId: v.id("consultations"),
    schemaVersion: v.string(),
    answers: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation || consultation.deletedAt) {
      throw new ConvexError({ code: "not_found" });
    }
    if (consultation.userId !== session.userId) {
      throw new ConvexError({ code: "forbidden" });
    }

    // Guard: 4 distinct photo slots present (one per slot, no soft-deleted).
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_consultation_slot", (q) =>
        q.eq("consultationId", args.consultationId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    const slotsPresent = new Set(photos.map((p) => p.slot));
    if (slotsPresent.size !== REQUIRED_PHOTO_COUNT) {
      throw new ConvexError({
        code: "missing_photos",
        message: `Expected 4 photos (${PHOTO_SLOTS.join(", ")}); got ${slotsPresent.size}.`,
      });
    }

    // Idempotency: reject if questionnaire_responses row already exists.
    const existing = await ctx.db
      .query("questionnaire_responses")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId),
      )
      .unique();
    if (existing) throw new ConvexError({ code: "already_submitted" });

    await ctx.db.insert("questionnaire_responses", {
      consultationId: args.consultationId,
      userId: session.userId,
      schemaVersion: args.schemaVersion,
      answers: args.answers,
      completedAt: Date.now(),
    });

    // Phase 3B stub — Phase 3C ships the real Claude pre-assessment call.
    await ctx.scheduler.runAfter(
      0,
      internal.consultations.aiStub.kickoffAiStub,
      { consultationId: args.consultationId },
    );

    return { ok: true as const };
  },
});
