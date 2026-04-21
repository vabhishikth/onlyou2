/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("reclassifyAllReports commit", () => {
  it("rejects commit when rangesSignature is stale", async () => {
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
        rangesSignature: "1000", // stale — actual max is 5000
      }),
    ).rejects.toThrow(/ranges_changed_since_preview/);
  });

  it("happy path: commit writes value updates + emits lab_report_updated per affected report", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const adminUserId = await ctx.db.insert("users", {
        role: "ADMIN",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
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
        status: "sub_optimal", // will flip to optimal after reclassify
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
        updatedAt: 5000,
      });
      return { adminUserId, userId, biomarkerReportId };
    });

    const result = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "commit", rangesSignature: "5000" },
    );
    expect(result.wouldChange).toBeGreaterThanOrEqual(1);
    expect(result.committedAt).toBeTypeOf("number");

    await t.run(async (ctx) => {
      const notifs = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("userId"), ids.userId))
        .collect();
      const updated = notifs.filter((n) => n.kind === "lab_report_updated");
      expect(updated.length).toBeGreaterThanOrEqual(1);

      const report = await ctx.db.get(ids.biomarkerReportId);
      expect(report).not.toBeNull();
      expect(report!.lastReclassifiedAt).toBeTypeOf("number");

      // Audit row must be written (sentinel admin path, proves the call site
      // in reclassifyAllReports commit mode actually reaches writeAuditLog).
      const audit = await ctx.db.query("admin_audit_log").collect();
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe("reclassify_all_commit");
      expect(audit[0].targetTable).toBe("biomarker_reference_ranges");
      expect(audit[0].adminUserId).toBe(ids.adminUserId);
      expect(audit[0].after).toMatchObject({ rangesSignature: "5000" });
    });
  });
});
