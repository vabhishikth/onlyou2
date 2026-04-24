import { v } from "convex/values";

import { normalizePhoneE164 } from "../../packages/core/src/phone/e164";
import { mutation, query } from "../_generated/server";

/**
 * Database-side OTP helpers. Lives in a non-`"use node"` file so it can
 * use convex queries/mutations. The action layer in `auth/otp.ts` calls
 * these via ctx.runMutation / ctx.runQuery.
 *
 * Session tokens are generated here using the Web Crypto API
 * (crypto.getRandomValues), which is available in Convex's V8 isolate
 * without `"use node"`.
 */

const MAX_ATTEMPTS = 3;

/**
 * Internal mutation — invalidates any existing otpAttempts row for this
 * phone and writes a fresh one.
 */
export const upsertOtpAttempt = mutation({
  args: {
    phone: v.string(),
    hashedOtp: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhoneE164(args.phone);
    const existing = await ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("otpAttempts", {
      phone,
      hashedOtp: args.hashedOtp,
      expiresAt: args.expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

/** Read the attempt row for a phone. */
export const getAttempt = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone: rawPhone }) => {
    const phone = normalizePhoneE164(rawPhone);
    return ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const incrementAttempt = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone: rawPhone }) => {
    const phone = normalizePhoneE164(rawPhone);
    const row = await ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
  },
});

/**
 * On successful OTP verify: find or create the user, mint a 30-day
 * session token, and return it. The action layer guarantees this is
 * only called after the OTP itself was validated.
 */
export const finalizeSignIn = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone: rawPhone }) => {
    const phone = normalizePhoneE164(rawPhone);
    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        phone,
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("Failed to create user");
    } else if (!user.phoneVerified) {
      await ctx.db.patch(user._id, { phoneVerified: true });
    }

    const attempt = await ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (attempt) await ctx.db.delete(attempt._id);

    const token = generateSessionToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    });

    return {
      token,
      userId: user._id as unknown as string,
      profileComplete: user.profileComplete,
    };
  },
});

/**
 * 256-bit random hex token from the Web Crypto API. Available in Convex's
 * V8 isolate without `"use node"`. CSPRNG-grade.
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export const _MAX_ATTEMPTS = MAX_ATTEMPTS;
