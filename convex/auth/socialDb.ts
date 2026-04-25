import { v } from "convex/values";

import { mutation } from "../_generated/server";

export const findOrCreateUserByEmail = mutation({
  args: { email: v.string(), name: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { email, name }) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        name: name ?? undefined,
        role: "PATIENT",
        phoneVerified: false,
        profileComplete: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("failed to create user");
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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
