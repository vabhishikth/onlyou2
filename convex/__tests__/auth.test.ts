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
