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

  it("commit uses patient's actual age (not hardcoded 30) when selecting referenceRangeId", async () => {
    // Regression test for C1: the bug used `age: 30` which would select the
    // adult range for a pediatric patient, producing a wrong referenceRangeId.
    // Seed a 6-year-old with hemoglobin 12.0 — the pediatric range [11, 15]
    // classifies this as "optimal", but `findReferenceRangeId` must be called
    // with age=6 so it returns the pediatric row (not the adult one for which
    // age=30 would have satisfied [18, 120]).
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        gender: "male",
        dob: "2020-01-01", // 6yo in 2026
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
      const valueId = await ctx.db.insert("biomarker_values", {
        biomarkerReportId,
        userId,
        canonicalId: "hemoglobin",
        nameOnReport: "Hemoglobin",
        valueType: "numeric",
        rawValue: "12.0",
        numericValue: 12.0,
        rawUnit: "g/dL",
        status: "sub_optimal", // starts sub_optimal so reclassify triggers a change
        classifiedAt: Date.now(),
      });
      const pediatricRangeId = await ctx.db.insert(
        "biomarker_reference_ranges",
        {
          canonicalId: "hemoglobin",
          displayName: "Hemoglobin",
          aliases: [],
          category: "Hematology",
          canonicalUnit: "g/dL",
          ageMin: 0,
          ageMax: 12,
          sex: "any",
          pregnancySensitive: false,
          optimalMin: 11,
          optimalMax: 15,
          explainer: "",
          source: "test",
          isActive: true,
          updatedAt: 3000,
        },
      );
      const adultRangeId = await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "hemoglobin",
        displayName: "Hemoglobin",
        aliases: [],
        category: "Hematology",
        canonicalUnit: "g/dL",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: false,
        optimalMin: 13,
        optimalMax: 17,
        explainer: "",
        source: "test",
        isActive: true,
        updatedAt: 3000,
      });
      return { valueId, pediatricRangeId, adultRangeId };
    });

    // Run commit mode (this also exercises the staleness-check-under-lock fix)
    const result = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "commit", rangesSignature: "3000" },
    );
    expect(result.committedAt).toBeTypeOf("number");
    expect(result.wouldChange).toBeGreaterThanOrEqual(1);

    // Verify the patched value points to the PEDIATRIC range, not the adult one.
    await t.run(async (ctx) => {
      const patched = await ctx.db.get(ids.valueId);
      expect(patched).not.toBeNull();
      expect(patched!.referenceRangeId).toBe(ids.pediatricRangeId);
      expect(patched!.referenceRangeId).not.toBe(ids.adultRangeId);
      expect(patched!.status).toBe("optimal");
    });
  });

  it("commit mode happy path: preview → commit with matching signature", async () => {
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
        updatedAt: 4000,
      });
    });

    const preview = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "preview" },
    );
    expect(preview.rangesSignature).toBe("4000");
    expect(preview.wouldChange).toBeGreaterThanOrEqual(1);

    const commit = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "commit", rangesSignature: preview.rangesSignature },
    );
    expect(commit.committedAt).toBeTypeOf("number");
    expect(commit.wouldChange).toBeGreaterThanOrEqual(1);
  });

  it("commit mode rejects stale rangesSignature (after lock acquired)", async () => {
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
        updatedAt: 5000,
      });
    });
    await expect(
      t.action(internal.biomarker.reclassifyAllReports.reclassifyAllReports, {
        mode: "commit",
        rangesSignature: "1", // stale
      }),
    ).rejects.toThrow(/ranges_changed_since_preview/);
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
