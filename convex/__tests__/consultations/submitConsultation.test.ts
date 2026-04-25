/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api } from "../../_generated/api";
import { PHOTO_SLOTS, type PhotoSlot } from "../../lib/photoSlot";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function seed(t: ReturnType<typeof convexTest>, slots: PhotoSlot[]) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      phone: "+919999900001",
      role: "PATIENT",
      phoneVerified: true,
      profileComplete: true,
      createdAt: 1,
    });
    const token = "tok";
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    });
    const consultationId = await ctx.db.insert("consultations", {
      userId,
      vertical: "hair_loss",
      status: "SUBMITTED",
      statusUpdatedAt: Date.now(),
      submittedAt: Date.now(),
      createdAt: Date.now(),
    });
    const fileId = await ctx.storage.store(new Blob(["x"]));
    for (const slot of slots) {
      await ctx.db.insert("photos", {
        consultationId,
        userId,
        slot,
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 1,
        uploadedAt: Date.now(),
      });
    }
    return { userId, token, consultationId };
  });
}

describe("consultations.submitConsultation.submitConsultation", () => {
  it("rejects when fewer than 4 photos", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t, ["crown", "hairline"]);
    await expect(
      t.mutation(api.consultations.submitConsultation.submitConsultation, {
        token,
        consultationId,
        schemaVersion: "hair-loss-v1",
        answers: { q1_age: "30", q2_sex: "male" },
      }),
    ).rejects.toThrow(/missing_photos|4 photos/i);
  });

  it("happy path — writes questionnaire_responses + schedules ai stub", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const { userId, token, consultationId } = await seed(t, [...PHOTO_SLOTS]);
    await t.mutation(api.consultations.submitConsultation.submitConsultation, {
      token,
      consultationId,
      schemaVersion: "hair-loss-v1",
      answers: { q1_age: "30", q2_sex: "male" },
    });
    const responses = await t.run((ctx) =>
      ctx.db
        .query("questionnaire_responses")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(responses).toHaveLength(1);
    expect(responses[0].schemaVersion).toBe("hair-loss-v1");
    expect(responses[0].userId).toBe(userId);
    // Run the scheduler to flush the ai stub (runAfter(0) needs timer advancement).
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const consultation = await t.run((ctx) => ctx.db.get(consultationId));
    expect(consultation?.status).toBe("AI_PROCESSING");
    vi.useRealTimers();
  });

  it("rejects on duplicate submission", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t, [...PHOTO_SLOTS]);
    await t.mutation(api.consultations.submitConsultation.submitConsultation, {
      token,
      consultationId,
      schemaVersion: "hair-loss-v1",
      answers: {},
    });
    await expect(
      t.mutation(api.consultations.submitConsultation.submitConsultation, {
        token,
        consultationId,
        schemaVersion: "hair-loss-v1",
        answers: {},
      }),
    ).rejects.toThrow(/already_submitted/);
  });

  it("rejects when caller does not own the consultation", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seed(t, [...PHOTO_SLOTS]);
    const attackerToken = await t.run(async (ctx) => {
      const attacker = await ctx.db.insert("users", {
        phone: "+919999900002",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: 1,
      });
      const tok = "attacker";
      await ctx.db.insert("sessions", {
        userId: attacker,
        token: tok,
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
      });
      return tok;
    });
    await expect(
      t.mutation(api.consultations.submitConsultation.submitConsultation, {
        token: attackerToken,
        consultationId,
        schemaVersion: "hair-loss-v1",
        answers: {},
      }),
    ).rejects.toThrow(/forbidden/);
  });
});

describe("consultations.submitConsultation.startConsultation", () => {
  it("creates a SUBMITTED consultation owned by the caller", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {
        phone: "+919999900003",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: 1,
      });
      const tok = "tok2";
      await ctx.db.insert("sessions", {
        userId: uid,
        token: tok,
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
      });
      return { userId: uid, token: tok };
    });
    const { consultationId } = await t.mutation(
      api.consultations.submitConsultation.startConsultation,
      { token, vertical: "hair_loss" },
    );
    const c = await t.run((ctx) => ctx.db.get(consultationId));
    expect(c?.userId).toBe(userId);
    expect(c?.vertical).toBe("hair_loss");
    expect(c?.status).toBe("SUBMITTED");
  });
});
