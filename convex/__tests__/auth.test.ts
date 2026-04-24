/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { normalizePhoneE164 } from "../../packages/core/src/phone/e164";
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
        .withIndex("by_phone", (q) => q.eq("phone", normalizePhoneE164(phone)))
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
        .withIndex("by_phone", (q) => q.eq("phone", normalizePhoneE164(phone)))
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
  it("accepts `000000` for +9199999000XX and creates user + session", async () => {
    const t = convexTest(schema, modules);
    const phone = "+919999900001";

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
        .withIndex("by_phone", (q) => q.eq("phone", "+919999900001"))
        .collect();
      const sessions = await ctx.db.query("sessions").collect();
      return { users, sessions };
    });
    expect(users).toHaveLength(1);
    expect(users[0].phoneVerified).toBe(true);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].token).toBe(result.token);
  });

  // Post-Phase-3A: the dev bypass is gated behind NODE_ENV !== "production"
  // AND !isProdDeployment(CONVEX_DEPLOYMENT). Both guards must pass for the
  // bypass to fire. Documents the hardened state.
  it("refuses dev bypass when NODE_ENV=production", async () => {
    const t = convexTest(schema, modules);
    const phone = "+919999900002";
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await t.action(api.auth.otp.sendOtp, { phone });
      await expect(
        t.action(api.auth.otp.verifyOtp, { phone, otp: "000000" }),
      ).rejects.toThrow(/Incorrect OTP|No OTP in progress/);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("refuses dev bypass when CONVEX_DEPLOYMENT looks prod", async () => {
    const t = convexTest(schema, modules);
    const phone = "+919999900005";
    const prev = process.env.CONVEX_DEPLOYMENT;
    process.env.CONVEX_DEPLOYMENT = "prod:onlyou-prod-abc";
    try {
      await t.action(api.auth.otp.sendOtp, { phone });
      await expect(
        t.action(api.auth.otp.verifyOtp, { phone, otp: "000000" }),
      ).rejects.toThrow(/Incorrect OTP|No OTP in progress/);
    } finally {
      process.env.CONVEX_DEPLOYMENT = prev;
    }
  });
});

describe("auth.otp — finalizeSignIn idempotency", () => {
  it("two dev-bypass sign-ins produce 1 user row and 2 session rows", async () => {
    const t = convexTest(schema, modules);
    const phone = "+919999900003";

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
        .withIndex("by_phone", (q) => q.eq("phone", normalizePhoneE164(phone)))
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

describe("auth.otp — phone normalisation", () => {
  it("spaced and unspaced callers resolve to the same user row", async () => {
    const t = convexTest(schema, modules);
    const spaced = "+91 99999 00050";
    const e164 = "+919999900050";

    // Use the spaced number (dev-bypass fires) for the first sign-in.
    await t.action(api.auth.otp.sendOtp, { phone: spaced });
    const a = await t.action(api.auth.otp.verifyOtp, {
      phone: spaced,
      otp: "000000",
    });

    // Use finalizeSignIn directly with the E.164 form — the OTP layer has
    // already normalised and stored the user under E.164; this call must
    // find that same row rather than creating a second one.
    const b = await t.mutation(api.auth.otpDb.finalizeSignIn, {
      phone: e164,
    });

    expect(a.userId).toBe(b.userId);

    const users = await t.run(async (ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", e164))
        .collect(),
    );
    expect(users).toHaveLength(1);
    expect(users[0].phone).toBe(e164);
  });
});

describe("auth.sessions — signOut", () => {
  it("deletes the sessions row and getCurrentUser returns null", async () => {
    const t = convexTest(schema, modules);
    const phone = "+91 99999 00004";

    await t.action(api.auth.otp.sendOtp, { phone });
    const { token } = await t.action(api.auth.otp.verifyOtp, {
      phone,
      otp: "000000",
    });

    const before = await t.query(api.auth.sessions.getCurrentUser, { token });
    expect(before).not.toBeNull();

    await t.mutation(api.auth.sessions.signOut, { token });

    const after = await t.query(api.auth.sessions.getCurrentUser, { token });
    expect(after).toBeNull();

    const rows = await t.run(async (ctx) => {
      return ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .collect();
    });
    expect(rows).toHaveLength(0);
  });
});
