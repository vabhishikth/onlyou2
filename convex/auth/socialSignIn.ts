"use node";

import { ConvexError, v } from "convex/values";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { api } from "../_generated/api";
import { action } from "../_generated/server";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

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

export const signInWithApple = action({
  args: { identityToken: v.string(), nonce: v.optional(v.string()) },
  handler: async (
    ctx,
    { identityToken, nonce },
  ): Promise<{ token: string; userId: string; profileComplete: boolean }> => {
    const audience = process.env.APPLE_OAUTH_CLIENT_ID;
    if (!audience) {
      throw new ConvexError({ code: "apple_oauth_not_configured" });
    }
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });
    if (!payload.email) {
      throw new ConvexError({ code: "apple_email_not_shared" });
    }
    if (nonce && payload.nonce !== nonce) {
      throw new ConvexError({ code: "apple_nonce_mismatch" });
    }
    const result = await ctx.runMutation(
      api.auth.socialDb.findOrCreateUserByEmail,
      { email: payload.email as string, name: null },
    );
    return result;
  },
});
