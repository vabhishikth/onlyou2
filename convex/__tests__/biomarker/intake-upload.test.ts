/// <reference types="vite/client" />
//
// Tests for the patient-facing intakeUpload mutation (Phase 2.5C, Task 5).
//
// convex-test pattern: convexTest(schema, modules) + a seeded `sessions`
// row whose token we pass through as an arg. ONLYOU v2 uses custom
// session-token auth (see convex/auth/sessions.ts + convex/users.ts);
// `t.withIdentity(...)` is not usable here. Storage blobs are seeded via
// ctx.storage.store() because convex-test treats _storage as a system
// table (same pattern used in parseLabReport.branches.test.ts).

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function seedUser(
  t: ReturnType<typeof convexTest>,
  phone?: string,
): Promise<Id<"users">> {
  return (await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      ...(phone ? { phone } : {}),
      role: "PATIENT" as const,
      phoneVerified: true,
      profileComplete: true,
      createdAt: Date.now(),
    });
  })) as Id<"users">;
}

async function seedSession(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
): Promise<string> {
  const token = `tok_${userId}_${Math.random().toString(16).slice(2)}`;
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    });
  });
  return token;
}

async function seedUserWithSession(
  t: ReturnType<typeof convexTest>,
  phone?: string,
): Promise<{ userId: Id<"users">; token: string }> {
  const userId = await seedUser(t, phone);
  const token = await seedSession(t, userId);
  return { userId, token };
}

async function seedStorageBlob(
  t: ReturnType<typeof convexTest>,
): Promise<Id<"_storage">> {
  return (await t.run(async (ctx) => {
    const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
    return await ctx.storage.store(blob);
  })) as Id<"_storage">;
}

describe("intakeUpload", () => {
  it("happy path inserts lab_report and returns uploaded status", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await seedUserWithSession(t, "+919999900001");
    const fileId = await seedStorageBlob(t);

    const result = await t.mutation(api.biomarker.intakeUpload.intakeUpload, {
      token,
      fileId,
      mimeType: "application/pdf",
      fileSizeBytes: 1024,
      source: "patient_upload",
    });

    expect(result).toHaveProperty("labReportId");
    expect(result.status).toBe("uploaded");

    // Verify both rate-limit buckets were created.
    const buckets = await t.run(async (ctx) => {
      return await ctx.db
        .query("parse_rate_limits")
        .withIndex("by_user_window", (q) => q.eq("userId", userId))
        .collect();
    });
    const windowTypes = buckets.map((b) => b.windowType).sort();
    expect(windowTypes).toEqual(["day", "month"]);
    expect(buckets.every((b) => b.count === 1)).toBe(true);
  });

  it("rejects when file over 20MB", async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);

    await expect(
      t.mutation(api.biomarker.intakeUpload.intakeUpload, {
        token,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 21 * 1024 * 1024,
        source: "patient_upload",
      }),
    ).rejects.toThrow(/file_too_large/);
  });

  it("rejects 6th upload in same IST day with rate_limited:day", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);

    // Pre-seed day bucket to 5 (daily limit) so the next call trips.
    await t.run(async (ctx) => {
      const { istDayBucket, istMonthBucket } =
        await import("../../biomarker/lib/rateLimits");
      const now = Date.now();
      await ctx.db.insert("parse_rate_limits", {
        userId,
        windowType: "day" as const,
        dateBucket: istDayBucket(now),
        count: 5,
        updatedAt: now,
      });
      await ctx.db.insert("parse_rate_limits", {
        userId,
        windowType: "month" as const,
        dateBucket: istMonthBucket(now),
        count: 5,
        updatedAt: now,
      });
    });

    await expect(
      t.mutation(api.biomarker.intakeUpload.intakeUpload, {
        token,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
        source: "patient_upload",
      }),
    ).rejects.toThrow(/rate_limited:day/);
  });

  it("rejects 51st upload in same IST month with rate_limited:month", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);

    // Pre-seed ONLY the month bucket at the monthly limit (50). The day
    // bucket is intentionally absent, so the failure must come from the
    // month guard, not the day guard.
    await t.run(async (ctx) => {
      const { istMonthBucket } = await import("../../biomarker/lib/rateLimits");
      const now = Date.now();
      await ctx.db.insert("parse_rate_limits", {
        userId,
        windowType: "month" as const,
        dateBucket: istMonthBucket(now),
        count: 50,
        updatedAt: now,
      });
    });

    await expect(
      t.mutation(api.biomarker.intakeUpload.intakeUpload, {
        token,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
        source: "patient_upload",
      }),
    ).rejects.toThrow(/rate_limited:month/);
  });

  it("rejects when BIOMARKER_PARSING_ENABLED feature flag is off", async () => {
    const t = convexTest(schema, modules);
    const { token } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);

    // Insert the kill-switch flag set to false.
    await t.run(async (ctx) => {
      await ctx.db.insert("featureFlags", {
        key: "BIOMARKER_PARSING_ENABLED",
        value: false,
        updatedAt: Date.now(),
      });
    });

    await expect(
      t.mutation(api.biomarker.intakeUpload.intakeUpload, {
        token,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
        source: "patient_upload",
      }),
    ).rejects.toThrow(/parsing_disabled/);
  });

  it("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);
    const fileId = await seedStorageBlob(t);

    await expect(
      t.mutation(api.biomarker.intakeUpload.intakeUpload, {
        token: "",
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
        source: "patient_upload",
      }),
    ).rejects.toThrow(/unauthenticated/);
  });
});
