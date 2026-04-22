/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

// ─── Helpers ────────────────────────────────────────────────────────────────

async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: "PATIENT" | "DOCTOR" | "NURSE",
): Promise<Id<"users">> {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      role,
      phoneVerified: true,
      profileComplete: true,
      createdAt: Date.now(),
    });
  });
}

async function seedSession(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  opts: { expired?: boolean } = {},
): Promise<string> {
  const token = `tok-${userId}-${Date.now()}-${Math.random()}`;
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: opts.expired ? Date.now() - 1000 : Date.now() + 60 * 60 * 1000,
      createdAt: Date.now(),
    });
  });
  return token;
}

async function seedLabReport(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
): Promise<Id<"lab_reports">> {
  return t.run(async (ctx) => {
    const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
    const fileId = await ctx.storage.store(blob);
    return ctx.db.insert("lab_reports", {
      userId,
      source: "patient_upload",
      fileId,
      mimeType: "application/pdf",
      fileSizeBytes: 14,
      contentHash: `hash-${userId}-${Date.now()}`,
      status: "ready",
      createdAt: Date.now(),
    });
  });
}

async function seedBiomarkerReport(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  labReportId: Id<"lab_reports">,
  opts: { deletedAt?: number } = {},
): Promise<Id<"biomarker_reports">> {
  return t.run(async (ctx) => {
    return ctx.db.insert("biomarker_reports", {
      labReportId,
      userId,
      narrative: "test narrative",
      narrativeModel: "claude-3",
      optimalCount: 1,
      subOptimalCount: 0,
      actionRequiredCount: 0,
      unclassifiedCount: 0,
      analyzedAt: Date.now(),
      ...(opts.deletedAt !== undefined ? { deletedAt: opts.deletedAt } : {}),
    });
  });
}

async function seedBiomarkerValue(
  t: ReturnType<typeof convexTest>,
  biomarkerReportId: Id<"biomarker_reports">,
  userId: Id<"users">,
  opts: { deletedAt?: number } = {},
): Promise<Id<"biomarker_values">> {
  return t.run(async (ctx) => {
    return ctx.db.insert("biomarker_values", {
      biomarkerReportId,
      userId,
      canonicalId: "tsh",
      nameOnReport: "TSH",
      valueType: "numeric",
      rawValue: "2.0",
      rawUnit: "mIU/L",
      numericValue: 2.0,
      status: "optimal",
      classifiedAt: Date.now(),
      ...(opts.deletedAt !== undefined ? { deletedAt: opts.deletedAt } : {}),
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("myBiomarkerReports", () => {
  it("throws unauthenticated on missing session token", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.biomarker.patient.myBiomarkerReports.myBiomarkerReports, {
        token: "no-such-token",
      }),
    ).rejects.toThrow(/unauthenticated/);
  });

  it("throws unauthenticated on expired session", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, "PATIENT");
    const token = await seedSession(t, userId, { expired: true });

    await expect(
      t.query(api.biomarker.patient.myBiomarkerReports.myBiomarkerReports, {
        token,
      }),
    ).rejects.toThrow(/unauthenticated/);
  });

  it("throws forbidden for non-PATIENT role (DOCTOR caller)", async () => {
    const t = convexTest(schema, modules);
    const doctorId = await seedUser(t, "DOCTOR");
    const token = await seedSession(t, doctorId);

    await expect(
      t.query(api.biomarker.patient.myBiomarkerReports.myBiomarkerReports, {
        token,
      }),
    ).rejects.toThrow(/forbidden/);
  });

  it("returns empty array when patient has no reports", async () => {
    const t = convexTest(schema, modules);
    const patientId = await seedUser(t, "PATIENT");
    const token = await seedSession(t, patientId);

    const result = await t.query(
      api.biomarker.patient.myBiomarkerReports.myBiomarkerReports,
      { token },
    );

    expect(result).toEqual([]);
  });

  it("returns only the caller's own reports (scoping)", async () => {
    const t = convexTest(schema, modules);

    // Seed two patients, each with a biomarker report.
    const patientA = await seedUser(t, "PATIENT");
    const patientB = await seedUser(t, "PATIENT");

    const labA = await seedLabReport(t, patientA);
    const labB = await seedLabReport(t, patientB);

    const reportA = await seedBiomarkerReport(t, patientA, labA);
    await seedBiomarkerReport(t, patientB, labB);

    const tokenA = await seedSession(t, patientA);

    const result = await t.query(
      api.biomarker.patient.myBiomarkerReports.myBiomarkerReports,
      { token: tokenA },
    );

    expect(result).toHaveLength(1);
    expect(result[0].report._id).toBe(reportA);
    expect(result[0].report.userId).toBe(patientA);
  });

  it("excludes soft-deleted reports AND soft-deleted values", async () => {
    const t = convexTest(schema, modules);
    const patientId = await seedUser(t, "PATIENT");
    const token = await seedSession(t, patientId);

    const lab = await seedLabReport(t, patientId);

    // Soft-deleted report — must not appear.
    await seedBiomarkerReport(t, patientId, lab, {
      deletedAt: Date.now() - 1000,
    });

    // Live report with one live value and one soft-deleted value.
    const lab2 = await seedLabReport(t, patientId);
    const liveReport = await seedBiomarkerReport(t, patientId, lab2);
    await seedBiomarkerValue(t, liveReport, patientId);
    await seedBiomarkerValue(t, liveReport, patientId, {
      deletedAt: Date.now() - 1000,
    });

    const result = await t.query(
      api.biomarker.patient.myBiomarkerReports.myBiomarkerReports,
      { token },
    );

    // Only the live report appears.
    expect(result).toHaveLength(1);
    expect(result[0].report._id).toBe(liveReport);
    // Only the live value appears — soft-deleted value is excluded.
    expect(result[0].values).toHaveLength(1);
    expect("deletedAt" in result[0].values[0]).toBe(false);
  });

  it("projects only whitelisted fields (no auto-leak of new schema fields)", async () => {
    const t = convexTest(schema, modules);
    const patientId = await seedUser(t, "PATIENT");
    const token = await seedSession(t, patientId);

    const lab = await seedLabReport(t, patientId);
    const reportId = await seedBiomarkerReport(t, patientId, lab);
    await seedBiomarkerValue(t, reportId, patientId);

    const result = await t.query(
      api.biomarker.patient.myBiomarkerReports.myBiomarkerReports,
      { token },
    );

    expect(result).toHaveLength(1);

    const reportKeys = Object.keys(result[0].report).sort();
    expect(reportKeys).toEqual(
      [
        "_id",
        "userId",
        "labReportId",
        "narrative",
        "optimalCount",
        "subOptimalCount",
        "actionRequiredCount",
        "unclassifiedCount",
        "analyzedAt",
      ].sort(),
    );

    const valueKeys = Object.keys(result[0].values[0]).sort();
    expect(valueKeys).toEqual(
      [
        "_id",
        "canonicalId",
        "nameOnReport",
        "valueType",
        "rawValue",
        "rawUnit",
        "numericValue",
        "status",
        "classifiedAt",
      ].sort(),
    );

    // Internal fields must not leak.
    expect("_creationTime" in result[0].report).toBe(false);
    expect("deletedAt" in result[0].report).toBe(false);
    expect("narrativeModel" in result[0].report).toBe(false);
    expect("_creationTime" in result[0].values[0]).toBe(false);
    expect("deletedAt" in result[0].values[0]).toBe(false);
  });
});
