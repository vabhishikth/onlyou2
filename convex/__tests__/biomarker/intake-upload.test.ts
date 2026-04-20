/// <reference types="vite/client" />
//
// Tests for the patient-facing intakeUpload mutation (Phase 2.5C, Task 5).
//
// convex-test pattern: convexTest(schema, modules) + t.withIdentity(...)
// for authenticated calls. Storage blobs are seeded via ctx.storage.store()
// because convex-test treats _storage as a system table (same pattern used
// in parseLabReport.branches.test.ts).

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function seedUser(
  t: ReturnType<typeof convexTest>,
  phone?: string,
): Promise<string> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      ...(phone ? { phone } : {}),
      role: "PATIENT" as const,
      phoneVerified: true,
      profileComplete: true,
      createdAt: Date.now(),
    });
  });
}

async function seedStorageBlob(
  t: ReturnType<typeof convexTest>,
): Promise<string> {
  return await t.run(async (ctx) => {
    const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
    return await ctx.storage.store(blob);
  });
}

describe("intakeUpload", () => {
  it("happy path inserts lab_report and returns uploaded status", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "+919999900001");
    const fileId = await seedStorageBlob(t);

    const result = await t
      .withIdentity({ subject: userId, issuer: "test" })
      .mutation(api.biomarker.intakeUpload.intakeUpload, {
        fileId: fileId as import("../../_generated/dataModel").Id<"_storage">,
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
        .withIndex("by_user_window", (q) =>
          q.eq(
            "userId",
            userId as import("../../_generated/dataModel").Id<"users">,
          ),
        )
        .collect();
    });
    const windowTypes = buckets.map((b) => b.windowType).sort();
    expect(windowTypes).toEqual(["day", "month"]);
    expect(buckets.every((b) => b.count === 1)).toBe(true);
  });

  it("rejects when file over 20MB", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const fileId = await seedStorageBlob(t);

    await expect(
      t
        .withIdentity({ subject: userId, issuer: "test" })
        .mutation(api.biomarker.intakeUpload.intakeUpload, {
          fileId: fileId as import("../../_generated/dataModel").Id<"_storage">,
          mimeType: "application/pdf",
          fileSizeBytes: 21 * 1024 * 1024,
          source: "patient_upload",
        }),
    ).rejects.toThrow(/file_too_large/);
  });

  it("rejects 6th upload in same IST day with rate_limited:day", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const fileId = await seedStorageBlob(t);

    // Pre-seed day bucket to 5 (daily limit) so the next call trips.
    await t.run(async (ctx) => {
      const { istDayBucket, istMonthBucket } =
        await import("../../biomarker/lib/rateLimits");
      const now = Date.now();
      await ctx.db.insert("parse_rate_limits", {
        userId: userId as import("../../_generated/dataModel").Id<"users">,
        windowType: "day" as const,
        dateBucket: istDayBucket(now),
        count: 5,
        updatedAt: now,
      });
      await ctx.db.insert("parse_rate_limits", {
        userId: userId as import("../../_generated/dataModel").Id<"users">,
        windowType: "month" as const,
        dateBucket: istMonthBucket(now),
        count: 5,
        updatedAt: now,
      });
    });

    await expect(
      t
        .withIdentity({ subject: userId, issuer: "test" })
        .mutation(api.biomarker.intakeUpload.intakeUpload, {
          fileId: fileId as import("../../_generated/dataModel").Id<"_storage">,
          mimeType: "application/pdf",
          fileSizeBytes: 1024,
          source: "patient_upload",
        }),
    ).rejects.toThrow(/rate_limited:day/);
  });

  it("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);
    const fileId = await seedStorageBlob(t);

    await expect(
      t.mutation(api.biomarker.intakeUpload.intakeUpload, {
        fileId: fileId as import("../../_generated/dataModel").Id<"_storage">,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
        source: "patient_upload",
      }),
    ).rejects.toThrow(/unauthenticated/);
  });
});
