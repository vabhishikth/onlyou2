"use node";

import { ConvexError, v } from "convex/values";
import { OAuth2Client } from "google-auth-library";

import { api } from "../_generated/api";
import { action } from "../_generated/server";

export const signInWithGoogle = action({
  args: { idToken: v.string() },
  handler: async (
    ctx,
    { idToken },
  ): Promise<{ token: string; userId: string; profileComplete: boolean }> => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw new ConvexError({ code: "google_oauth_not_configured" });
    }
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new ConvexError({ code: "google_email_unverified" });
    }
    const result = await ctx.runMutation(
      api.auth.socialDb.findOrCreateUserByEmail,
      { email: payload.email, name: payload.name ?? null },
    );
    return result;
  },
});
