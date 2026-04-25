/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function seed(t: ReturnType<typeof convexTest>) {
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
    return { userId, token, consultationId };
  });
}

describe("consultations.photos.recordPhoto", () => {
  it("rejects an invalid slot", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t);
    const fileId = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.consultations.photos.recordPhoto, {
        token,
        consultationId,
        slot: "not_a_real_slot" as never,
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 1,
      }),
    ).rejects.toThrow();
  });

  it("inserts a photos row on a valid call", async () => {
    const t = convexTest(schema, modules);
    const { userId, token, consultationId } = await seed(t);
    const fileId = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await t.mutation(api.consultations.photos.recordPhoto, {
      token,
      consultationId,
      slot: "crown",
      fileId,
      mimeType: "image/jpeg",
      fileSizeBytes: 1,
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("photos")
        .withIndex("by_consultation_slot", (q) =>
          q.eq("consultationId", consultationId).eq("slot", "crown"),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
  });

  it("overwrites the prior photo when the same slot is recorded twice", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t);
    const fileA = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const fileB = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.consultations.photos.recordPhoto, {
      token,
      consultationId,
      slot: "crown",
      fileId: fileA,
      mimeType: "image/jpeg",
      fileSizeBytes: 1,
    });
    await t.mutation(api.consultations.photos.recordPhoto, {
      token,
      consultationId,
      slot: "crown",
      fileId: fileB,
      mimeType: "image/jpeg",
      fileSizeBytes: 1,
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("photos")
        .withIndex("by_consultation_slot", (q) =>
          q.eq("consultationId", consultationId).eq("slot", "crown"),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].fileId).toBe(fileB);
  });

  it("rejects calls by a session that does not own the consultation", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seed(t);
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
    const fileId = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.consultations.photos.recordPhoto, {
        token: attackerToken,
        consultationId,
        slot: "crown",
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 1,
      }),
    ).rejects.toThrow(/unauthor|forbidden/i);
  });

  it("rejects when fileSizeBytes exceeds 15 MB", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t);
    const fileId = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.consultations.photos.recordPhoto, {
        token,
        consultationId,
        slot: "crown",
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 15 * 1024 * 1024 + 1,
      }),
    ).rejects.toThrow(/too_large/i);
  });
});
