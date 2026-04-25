/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async verifyIdToken({ idToken }: { idToken: string }) {
      if (idToken === "invalid") throw new Error("invalid token");
      return {
        getPayload: () => ({
          email: "test@example.com",
          email_verified: true,
          name: "Test User",
          sub: "google-subject-123",
        }),
      };
    }
  },
}));

vi.mock("jose", () => {
  return {
    createRemoteJWKSet: () => ({}),
    jwtVerify: async (token: string) => {
      if (token === "invalid") throw new Error("invalid token");
      const baseEmail = "apple-user@example.com";
      if (token === "no-email") {
        return {
          payload: {
            iss: "https://appleid.apple.com",
            aud: "test-apple-aud",
          },
        };
      }
      if (token === "wrong-nonce") {
        return {
          payload: {
            iss: "https://appleid.apple.com",
            aud: "test-apple-aud",
            email: baseEmail,
            nonce: "actual-nonce",
          },
        };
      }
      return {
        payload: {
          iss: "https://appleid.apple.com",
          aud: "test-apple-aud",
          email: baseEmail,
          nonce: "matching-nonce",
        },
      };
    },
  };
});

describe("auth.socialSignIn.signInWithGoogle", () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
  });

  it("rejects an invalid token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.socialSignIn.signInWithGoogle, { idToken: "invalid" }),
    ).rejects.toThrow();
  });

  it("creates a new user on first sign-in and returns a session token", async () => {
    const t = convexTest(schema, modules);
    const result = await t.action(api.auth.socialSignIn.signInWithGoogle, {
      idToken: "valid-token",
    });
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    const users = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "test@example.com"))
        .collect(),
    );
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Test User");
    expect(users[0].profileComplete).toBe(false);
  });

  it("returns the same userId for a repeat sign-in", async () => {
    const t = convexTest(schema, modules);
    const a = await t.action(api.auth.socialSignIn.signInWithGoogle, {
      idToken: "valid-token",
    });
    const b = await t.action(api.auth.socialSignIn.signInWithGoogle, {
      idToken: "valid-token",
    });
    expect(a.userId).toBe(b.userId);
    expect(a.token).not.toBe(b.token);
  });

  it("rejects when GOOGLE_OAUTH_CLIENT_ID env is missing", async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.socialSignIn.signInWithGoogle, {
        idToken: "valid-token",
      }),
    ).rejects.toThrow(/google_oauth_not_configured/);
  });
});

describe("auth.socialSignIn.signInWithApple", () => {
  beforeEach(() => {
    process.env.APPLE_OAUTH_CLIENT_ID = "test-apple-aud";
  });

  it("creates a new user on first valid sign-in", async () => {
    const t = convexTest(schema, modules);
    const result = await t.action(api.auth.socialSignIn.signInWithApple, {
      identityToken: "valid",
    });
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects when APPLE_OAUTH_CLIENT_ID is missing", async () => {
    delete process.env.APPLE_OAUTH_CLIENT_ID;
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.socialSignIn.signInWithApple, {
        identityToken: "valid",
      }),
    ).rejects.toThrow(/apple_oauth_not_configured/);
  });

  it("rejects when payload has no email (user hid email)", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.socialSignIn.signInWithApple, {
        identityToken: "no-email",
      }),
    ).rejects.toThrow(/apple_email_not_shared/);
  });

  it("rejects when nonce mismatch", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.socialSignIn.signInWithApple, {
        identityToken: "wrong-nonce",
        nonce: "matching-nonce",
      }),
    ).rejects.toThrow(/apple_nonce_mismatch/);
  });
});
