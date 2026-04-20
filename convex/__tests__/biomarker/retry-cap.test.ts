/// <reference types="vite/client" />
//
// Tests for the patient-facing retryParseLabReport mutation (Phase 2.5C, Task 6).
//
// Uses session-token auth (see docs/decisions/2026-04-20-session-token-auth-
// in-2-5c-mutations.md). Seed helpers mirror intake-upload.test.ts — inline
// copy for now; refactoring to a shared helper is an expanded-scope decision.

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

async function seedLabReport(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  fileId: Id<"_storage">,
  overrides: {
    status?:
      | "uploaded"
      | "parsing"
      | "parse_failed"
      | "ready"
      | "unreadable"
      | "duplicate"
      | "deleted";
    userRetryCount?: number;
  } = {},
): Promise<Id<"lab_reports">> {
  return (await t.run(async (ctx) => {
    return await ctx.db.insert("lab_reports", {
      userId,
      source: "patient_upload" as const,
      fileId,
      mimeType: "application/pdf" as const,
      fileSizeBytes: 1024,
      contentHash: "r",
      status: overrides.status ?? ("parse_failed" as const),
      errorCode: "extraction_failed",
      errorMessage: "test",
      retryCount: 3,
      userRetryCount: overrides.userRetryCount ?? 0,
      nextRetryAt: 12345,
      lockedAt: 999,
      firstAttemptAt: 100,
      createdAt: Date.now(),
    });
  })) as Id<"lab_reports">;
}

describe("retryParseLabReport", () => {
  it("happy path — bumps userRetryCount, resets pipeline state, schedules reparse", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await seedUserWithSession(t, "+919999900001");
    const fileId = await seedStorageBlob(t);
    const labReportId = await seedLabReport(t, userId, fileId);

    const result = await t.mutation(
      api.biomarker.retryParseLabReport.retryParseLabReport,
      { token, labReportId },
    );

    expect(result.labReportId).toBe(labReportId);
    expect(result.status).toBe("uploaded");
    expect(result.userRetryCount).toBe(1);

    const row = await t.run(async (ctx) => await ctx.db.get(labReportId));
    expect(row).not.toBeNull();
    expect(row!.status).toBe("uploaded");
    expect(row!.userRetryCount).toBe(1);
    expect(row!.retryCount).toBe(0);
    expect(row!.errorCode).toBeUndefined();
    expect(row!.errorMessage).toBeUndefined();
    expect(row!.nextRetryAt).toBeUndefined();
    expect(row!.lockedAt).toBeUndefined();
    expect(row!.firstAttemptAt).toBeUndefined();
  });

  it("rejects when userRetryCount has hit the lifetime cap (3)", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);
    const labReportId = await seedLabReport(t, userId, fileId, {
      userRetryCount: 3,
    });

    await expect(
      t.mutation(api.biomarker.retryParseLabReport.retryParseLabReport, {
        token,
        labReportId,
      }),
    ).rejects.toThrow(/retry_cap_exceeded/);
  });

  it("rejects when the lab_report is not in parse_failed status", async () => {
    const t = convexTest(schema, modules);
    const { userId, token } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);
    const labReportId = await seedLabReport(t, userId, fileId);

    // Patch to 'ready' to exercise the wrong-status guard.
    await t.run(async (ctx) => {
      await ctx.db.patch(labReportId, { status: "ready" as const });
    });

    await expect(
      t.mutation(api.biomarker.retryParseLabReport.retryParseLabReport, {
        token,
        labReportId,
      }),
    ).rejects.toThrow(/invalid_retry_state/);
  });

  it("rejects when caller is not the owner (forbidden)", async () => {
    const t = convexTest(schema, modules);
    const { userId: ownerId } = await seedUserWithSession(t, "+919999900002");
    const { token: otherToken } = await seedUserWithSession(t, "+919999900003");
    const fileId = await seedStorageBlob(t);
    const labReportId = await seedLabReport(t, ownerId, fileId);

    await expect(
      t.mutation(api.biomarker.retryParseLabReport.retryParseLabReport, {
        token: otherToken,
        labReportId,
      }),
    ).rejects.toThrow(/forbidden/);
  });

  it("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedUserWithSession(t);
    const fileId = await seedStorageBlob(t);
    const labReportId = await seedLabReport(t, userId, fileId);

    await expect(
      t.mutation(api.biomarker.retryParseLabReport.retryParseLabReport, {
        token: "",
        labReportId,
      }),
    ).rejects.toThrow(/unauthenticated/);
  });
});
