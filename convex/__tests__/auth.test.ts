/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

// convex-test autodiscovers convex/**/*.*s via import.meta.glob relative to
// its own dist/index.js, which resolves correctly from node_modules. We pass
// our own glob to be explicit about which files back the mock backend.
const modules = import.meta.glob("../**/*.ts");

describe("auth.otp — OTP lockout (MAX_ATTEMPTS = 3)", () => {
  // MAX_ATTEMPTS = 3 in convex/auth/otp.ts means: the user gets 3 wrong
  // guesses (each bumps the counter to 1, 2, then 3 and throws "Incorrect
  // OTP"). The *next* call trips `attempts >= MAX_ATTEMPTS` before the
  // bcrypt compare and throws "Too many attempts". So the lockout shows
  // up on the 4th verify call.
  it("rejects the 4th wrong OTP with 'Too many attempts'", async () => {
    const t = convexTest(schema, modules);
    const phone = "+91 98765 43210";

    await t.action(api.auth.otp.sendOtp, { phone });

    for (let i = 0; i < 3; i++) {
      await expect(
        t.action(api.auth.otp.verifyOtp, { phone, otp: "111111" }),
      ).rejects.toThrow(/Incorrect OTP/);
    }

    await expect(
      t.action(api.auth.otp.verifyOtp, { phone, otp: "111111" }),
    ).rejects.toThrow(/Too many attempts/);

    const attempt = await t.run(async (ctx) => {
      return ctx.db
        .query("otpAttempts")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique();
    });
    expect(attempt).not.toBeNull();
    expect(attempt?.attempts).toBe(3);
  });
});

describe("auth.otp — OTP expiry", () => {
  it("rejects a verify after the TTL has elapsed", async () => {
    const t = convexTest(schema, modules);
    const phone = "+91 98765 43211";

    await t.action(api.auth.otp.sendOtp, { phone });

    // Push the attempt row's expiresAt into the past.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("otpAttempts")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .unique();
      if (!row) throw new Error("expected otpAttempts row");
      await ctx.db.patch(row._id, { expiresAt: Date.now() - 1000 });
    });

    await expect(
      t.action(api.auth.otp.verifyOtp, { phone, otp: "123456" }),
    ).rejects.toThrow(/OTP expired/);
  });
});

describe("auth.otp — dev bypass", () => {
  it("accepts `000000` for +91 99999 000XX and creates user + session", async () => {
    const t = convexTest(schema, modules);
    const phone = "+91 99999 00001";

    await t.action(api.auth.otp.sendOtp, { phone });
    const result = await t.action(api.auth.otp.verifyOtp, {
      phone,
      otp: "000000",
    });

    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    expect(result.profileComplete).toBe(false);

    const { users, sessions } = await t.run(async (ctx) => {
      const users = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .collect();
      const sessions = await ctx.db.query("sessions").collect();
      return { users, sessions };
    });
    expect(users).toHaveLength(1);
    expect(users[0].phoneVerified).toBe(true);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].token).toBe(result.token);
  });

  // CURRENT BEHAVIOR: the dev bypass has no NODE_ENV gate — it works
  // regardless of environment. This test locks in that behavior so a
  // future fix (gate behind NODE_ENV !== 'production') will intentionally
  // fail this test and force a conscious update. See docs/DEFERRED.md
  // "Phase 2B review deferrals" for the follow-up plan.
  it("works regardless of NODE_ENV (documents current lack of gate)", async () => {
    const t = convexTest(schema, modules);
    const phone = "+91 99999 00002";
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await t.action(api.auth.otp.sendOtp, { phone });
      const result = await t.action(api.auth.otp.verifyOtp, {
        phone,
        otp: "000000",
      });
      expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe("auth.otp — finalizeSignIn idempotency", () => {
  it("two dev-bypass sign-ins produce 1 user row and 2 session rows", async () => {
    const t = convexTest(schema, modules);
    const phone = "+91 99999 00003";

    await t.action(api.auth.otp.sendOtp, { phone });
    const first = await t.action(api.auth.otp.verifyOtp, {
      phone,
      otp: "000000",
    });

    await t.action(api.auth.otp.sendOtp, { phone });
    const second = await t.action(api.auth.otp.verifyOtp, {
      phone,
      otp: "000000",
    });

    expect(first.userId).toBe(second.userId);
    expect(first.token).not.toBe(second.token);

    const { users, sessions } = await t.run(async (ctx) => {
      const users = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .collect();
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) =>
          q.eq("userId", users[0]?._id as (typeof users)[number]["_id"]),
        )
        .collect();
      return { users, sessions };
    });
    expect(users).toHaveLength(1);
    expect(sessions).toHaveLength(2);
  });
});
