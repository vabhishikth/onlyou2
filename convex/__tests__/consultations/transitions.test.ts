/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function setupConsultation(
  t: ReturnType<typeof convexTest>,
  status: Doc<"consultations">["status"] = "SUBMITTED",
) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      phone: "+919999900001",
      role: "PATIENT",
      phoneVerified: true,
      profileComplete: true,
      createdAt: 1,
    });
    const consultationId = await ctx.db.insert("consultations", {
      userId,
      vertical: "hair_loss",
      status,
      statusUpdatedAt: Date.now(),
      submittedAt: Date.now(),
      createdAt: Date.now(),
    });
    return { userId, consultationId };
  });
}

describe("transitionStatus", () => {
  it("SUBMITTED → AI_PROCESSING is allowed", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t);
    await t.mutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      actorUserId: userId,
    });
    const row = await t.run((ctx) => ctx.db.get(consultationId));
    expect(row?.status).toBe("AI_PROCESSING");
  });

  it("SUBMITTED → PRESCRIBED is rejected (not in validTransitions)", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t);
    await expect(
      t.mutation(internal.consultations.transitions.transitionStatus, {
        consultationId,
        toStatus: "PRESCRIBED",
        kind: "doctor",
        actorUserId: userId,
      }),
    ).rejects.toThrow(/invalid transition/i);
  });

  it("writes a consultation_status_history row on every allowed transition", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t);
    await t.mutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      actorUserId: userId,
    });
    const history = await t.run((ctx) =>
      ctx.db
        .query("consultation_status_history")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBe("SUBMITTED");
    expect(history[0].toStatus).toBe("AI_PROCESSING");
    expect(history[0].kind).toBe("system");
  });

  it("DECLINED is terminal — every outbound transition rejects", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t, "DECLINED");
    await expect(
      t.mutation(internal.consultations.transitions.transitionStatus, {
        consultationId,
        toStatus: "REVIEWING",
        kind: "doctor",
        actorUserId: userId,
      }),
    ).rejects.toThrow(/terminal/i);
  });

  it("systemTransition AWAITING_PAYMENT → EXPIRED_UNPAID is allowed (not in user validTransitions but in systemTransitions)", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await setupConsultation(t, "AWAITING_PAYMENT");
    await t.mutation(internal.consultations.transitions.systemTransition, {
      consultationId,
      toStatus: "EXPIRED_UNPAID",
      reason: "30d expiry",
    });
    const row = await t.run((ctx) => ctx.db.get(consultationId));
    expect(row?.status).toBe("EXPIRED_UNPAID");
  });

  it("systemTransition rejects a transition not listed in systemTransitions", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await setupConsultation(t, "SUBMITTED");
    await expect(
      t.mutation(internal.consultations.transitions.systemTransition, {
        consultationId,
        toStatus: "DELIVERED",
        reason: "unauthorised",
      }),
    ).rejects.toThrow(/invalid system transition/i);
  });

  it("systemTransition rejects from terminal state", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await setupConsultation(t, "DECLINED");
    await expect(
      t.mutation(internal.consultations.transitions.systemTransition, {
        consultationId,
        toStatus: "ABANDONED",
        reason: "should not work",
      }),
    ).rejects.toThrow(/terminal/i);
  });
});
