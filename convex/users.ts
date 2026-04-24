import { ConvexError, v } from "convex/values";

import { ROLES } from "../packages/core/src/enums/roles";
import { normalizePhoneE164 } from "../packages/core/src/phone/e164";
import {
  computeAgeYears,
  MIN_AGE_YEARS,
} from "../packages/core/src/validators/age";

import { internalMutation, internalQuery, mutation } from "./_generated/server";

const roleValidator = v.union(...ROLES.map((r) => v.literal(r)));

export const completeProfile = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    dob: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    pincode: v.string(),
    city: v.string(),
    state: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session) throw new Error("Not authenticated");

    // 18+ gate — computed server-side so a tampered client can't bypass it.
    const age = computeAgeYears(args.dob);
    if (!Number.isFinite(age)) {
      throw new ConvexError({
        code: "INVALID_DOB",
        message: "Please enter a valid date of birth.",
      });
    }
    if (age < MIN_AGE_YEARS) {
      throw new ConvexError({
        code: "UNDER_AGE",
        message: `You must be ${MIN_AGE_YEARS} or older to use ONLYOU.`,
      });
    }

    await ctx.db.patch(session.userId, {
      name: args.name,
      dob: args.dob,
      gender: args.gender,
      pincode: args.pincode,
      city: args.city,
      state: args.state,
      address: args.address,
      profileComplete: true,
    });
  },
});

export const getUserByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone: rawPhone }) => {
    const phone = normalizePhoneE164(rawPhone);
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    phone: v.string(),
    role: roleValidator,
    phoneVerified: v.boolean(),
    profileComplete: v.boolean(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhoneE164(args.phone);
    return await ctx.db.insert("users", {
      phone,
      role: args.role,
      phoneVerified: args.phoneVerified,
      profileComplete: args.profileComplete,
      createdAt: Date.now(),
    });
  },
});
