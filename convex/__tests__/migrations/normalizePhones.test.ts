/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("migrations.phase3a.normalizePhones", () => {
  it("rewrites spaced phones to E.164 and is idempotent", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        phone: "+91 99999 00001",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: 1,
      });
      await ctx.db.insert("users", {
        phone: "+919999900002",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: 2,
      });
      await ctx.db.insert("otpAttempts", {
        phone: "+91 99999 00003",
        hashedOtp: "x",
        attempts: 0,
        expiresAt: 10_000,
        createdAt: 1,
      });
    });

    const firstRun = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(firstRun).toEqual({
      usersUpdated: 1,
      usersAlreadyCanonical: 1,
      otpAttemptsUpdated: 1,
      usersDeleted: 0,
    });

    const secondRun = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(secondRun).toEqual({
      usersUpdated: 0,
      usersAlreadyCanonical: 2,
      otpAttemptsUpdated: 0,
      usersDeleted: 0,
    });

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users.map((u) => u.phone).sort()).toEqual([
      "+919999900001",
      "+919999900002",
    ]);
  });

  it("merges a duplicate E.164 row when one already exists", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const canonical = await ctx.db.insert("users", {
        phone: "+919999900099",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: 1,
      });
      const legacy = await ctx.db.insert("users", {
        phone: "+91 99999 00099",
        role: "PATIENT",
        phoneVerified: false,
        profileComplete: false,
        createdAt: 2,
      });
      await ctx.db.insert("sessions", {
        userId: legacy,
        token: "t",
        expiresAt: Date.now() + 1000,
        createdAt: Date.now(),
      });
      return { canonical, legacy };
    });

    const result = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(result.usersDeleted).toBe(1);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0].phone).toBe("+919999900099");
    expect(users[0]._id).toBe(ids.canonical);

    const sessions = await t.run((ctx) => ctx.db.query("sessions").collect());
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toBe(users[0]._id);
  });
});
