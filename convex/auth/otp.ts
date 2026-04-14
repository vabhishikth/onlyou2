"use node";

import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { v } from "convex/values";

import { api } from "../_generated/api";
import { action, mutation } from "../_generated/server";

import { ConsoleLogSender } from "./sender";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const DEV_BYPASS_PREFIX = "+91 99999 000";
const DEV_BYPASS_OTP = "000000";

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
  handler: async (ctx, { phone }) => {
    const otp = randomSixDigit();
    const hashed = await bcrypt.hash(otp, 10);
    const expiresAt = Date.now() + OTP_TTL_MS;

    await ctx.runMutation(api.auth.otp.upsertOtpAttempt, {
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
 * Internal mutation — called from the sendOtp action. Invalidates any
 * existing otpAttempts row for the phone and writes a fresh one.
 */
export const upsertOtpAttempt = mutation({
  args: {
    phone: v.string(),
    hashedOtp: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("otpAttempts", {
      ...args,
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Verify a submitted OTP. On success, creates (or finds) a user record
 * for this phone, creates a session row, and returns the session token.
 * Increments the attempt counter on failure. Locks out after MAX_ATTEMPTS.
 *
 * Dev bypass: in dev deployments, numbers matching DEV_BYPASS_PREFIX
 * accept DEV_BYPASS_OTP unconditionally.
 */
export const verifyOtp = action({
  args: { phone: v.string(), otp: v.string() },
  handler: async (
    ctx,
    { phone, otp },
  ): Promise<{ token: string; userId: string; profileComplete: boolean }> => {
    const isDevBypass =
      phone.startsWith(DEV_BYPASS_PREFIX) && otp === DEV_BYPASS_OTP;

    if (!isDevBypass) {
      const attempt = await ctx.runMutation(api.auth.otp.getAttempt, {
        phone,
      });
      if (!attempt) throw new Error("No OTP in progress for this phone");
      if (attempt.expiresAt < Date.now()) throw new Error("OTP expired");
      if (attempt.attempts >= MAX_ATTEMPTS)
        throw new Error("Too many attempts");

      const match = await bcrypt.compare(otp, attempt.hashedOtp);
      if (!match) {
        await ctx.runMutation(api.auth.otp.incrementAttempt, { phone });
        throw new Error("Incorrect OTP");
      }
    }

    const result = await ctx.runMutation(api.auth.otp.finalizeSignIn, {
      phone,
    });
    return result;
  },
});

/** Read the attempt row for a phone (internal). */
export const getAttempt = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    return ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const incrementAttempt = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const row = await ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
  },
});

export const finalizeSignIn = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
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

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}
