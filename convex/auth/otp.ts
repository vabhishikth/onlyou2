"use node";

import bcrypt from "bcryptjs";
import { v } from "convex/values";

import { normalizePhoneE164 } from "../../packages/core/src/phone/e164";
import { api } from "../_generated/api";
import { action } from "../_generated/server";
import { isProdDeployment } from "../lib/envGuards";

import { ConsoleLogSender } from "./sender";

/**
 * Action layer for phone-OTP auth. Uses bcryptjs (Node-only) to hash and
 * compare codes. Database I/O is delegated to `auth/otpDb.ts` via
 * ctx.runMutation / ctx.runQuery — Convex requires that any file with
 * `"use node"` contain only actions.
 */

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const DEV_BYPASS_PREFIX = "+9199999000"; // E.164: covers +919999900000..99
const DEV_BYPASS_OTP = "000000";

function isDevBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (isProdDeployment(process.env.CONVEX_DEPLOYMENT ?? "")) return false;
  return true;
}

function randomSixDigit(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Initiate OTP send. Creates a fresh otpAttempts row (invalidating any
 * prior one for this phone) and calls the active sender. Phase 2 sender
 * is always ConsoleLogSender — prints "[OTP] <phone> → <code>" to
 * Convex logs.
 */
export const sendOtp = action({
  args: { phone: v.string() },
  handler: async (ctx, { phone: rawPhone }) => {
    const phone = normalizePhoneE164(rawPhone);
    const otp = randomSixDigit();
    const hashed = await bcrypt.hash(otp, 10);
    const expiresAt = Date.now() + OTP_TTL_MS;

    await ctx.runMutation(api.auth.otpDb.upsertOtpAttempt, {
      phone,
      hashedOtp: hashed,
      expiresAt,
    });

    const sender = new ConsoleLogSender();
    await sender.send(phone, otp);

    return { ok: true as const, expiresAt };
  },
});

/**
 * Verify a submitted OTP. On success, creates (or finds) a user record
 * for this phone, creates a session row, and returns the session token.
 * Increments the attempt counter on failure. Locks out after MAX_ATTEMPTS.
 *
 * Dev bypass: numbers matching DEV_BYPASS_PREFIX accept DEV_BYPASS_OTP
 * unconditionally — used by the dev quick-login drawer.
 */
export const verifyOtp = action({
  args: { phone: v.string(), otp: v.string() },
  handler: async (
    ctx,
    { phone: rawPhone, otp },
  ): Promise<{ token: string; userId: string; profileComplete: boolean }> => {
    const phone = normalizePhoneE164(rawPhone);
    const isDevBypass =
      isDevBypassAllowed() &&
      phone.startsWith(DEV_BYPASS_PREFIX) &&
      otp === DEV_BYPASS_OTP;

    if (!isDevBypass) {
      const attempt = await ctx.runQuery(api.auth.otpDb.getAttempt, { phone });
      if (!attempt) throw new Error("No OTP in progress for this phone");
      if (attempt.expiresAt < Date.now()) throw new Error("OTP expired");
      if (attempt.attempts >= MAX_ATTEMPTS)
        throw new Error("Too many attempts");

      const match = await bcrypt.compare(otp, attempt.hashedOtp);
      if (!match) {
        await ctx.runMutation(api.auth.otpDb.incrementAttempt, { phone });
        throw new Error("Incorrect OTP");
      }
    }

    const result = await ctx.runMutation(api.auth.otpDb.finalizeSignIn, {
      phone,
    });
    return result;
  },
});
