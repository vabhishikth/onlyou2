import { v } from "convex/values";

import { mutation, query } from "../_generated/server";

/**
 * Resolve a session token to a user row. Returns null if the token is
 * missing, invalid, or expired. Every authenticated client query in
 * Phase 2 calls this indirectly through useCurrentUser().
 */
export const getCurrentUser = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    if (!token) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    return user;
  },
});

/**
 * Invalidate a session token. Mobile client calls this on sign-out
 * before clearing secure-store.
 */
export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
