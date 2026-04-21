/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("reclassifyAllReports preview", () => {
  it("returns rangesSignature as string; does not write", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "tsh",
        displayName: "TSH",
        aliases: [],
        category: "Thyroid",
        canonicalUnit: "mIU/L",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: false,
        optimalMin: 0.5,
        optimalMax: 4.5,
        explainer: "",
        source: "test",
        isActive: true,
        updatedAt: 1000,
      });
    });
    const result = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "preview" },
    );
    expect(result.rangesSignature).toBe("1000");
    expect(result.totalValues).toBe(0);
    expect(result.wouldChange).toBe(0);
  });

  it("computes wouldChange + byTransition + affectedPatientCount", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        gender: "male",
        dob: "1990-01-01",
        createdAt: Date.now(),
      });
      const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
      const fileId = await ctx.storage.store(blob);
      const labReportId = await ctx.db.insert("lab_reports", {
        userId,
        source: "patient_upload",
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1,
        contentHash: "x",
        status: "ready",
        createdAt: Date.now(),
      });
      const biomarkerReportId = await ctx.db.insert("biomarker_reports", {
        labReportId,
        userId,
        narrative: "",
        narrativeModel: "",
        optimalCount: 0,
        subOptimalCount: 1,
        actionRequiredCount: 0,
        unclassifiedCount: 0,
        analyzedAt: Date.now(),
      });
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId,
        userId,
        canonicalId: "tsh",
        nameOnReport: "TSH",
        valueType: "numeric",
        rawValue: "3.0",
        numericValue: 3.0,
        status: "sub_optimal",
        classifiedAt: Date.now(),
      });
      await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "tsh",
        displayName: "TSH",
        aliases: [],
        category: "Thyroid",
        canonicalUnit: "mIU/L",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: false,
        optimalMin: 0.5,
        optimalMax: 4.5,
        explainer: "",
        source: "test",
        isActive: true,
        updatedAt: 2000,
      });
    });
    const result = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "preview" },
    );
    expect(result.wouldChange).toBeGreaterThanOrEqual(1);
    expect(result.affectedPatientCount).toBe(1);
    expect(result.byTransition["sub_optimal_to_optimal"]).toBe(1);
  });

  it("holds global lock during preview; another global call returns reclassify_in_progress", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("reclassify_locks", {
        canonicalId: "*",
        ownerToken: "held",
        acquiredAt: Date.now(),
        expiresAt: Date.now() + 300_000,
        action: "reclassifyAllReportsPreview",
      });
    });
    await expect(
      t.action(internal.biomarker.reclassifyAllReports.reclassifyAllReports, {
        mode: "preview",
      }),
    ).rejects.toThrow(/reclassify_in_progress/);
  });
});
