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
