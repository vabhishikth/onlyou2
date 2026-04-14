import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const getCurrentUser = query({
  args: {},
  handler: async () => {
    return null;
  },
});

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
