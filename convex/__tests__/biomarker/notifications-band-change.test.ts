/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("lab_report_updated band-change-only emission", () => {
  it("emits zero notifications when no values change", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        gender: "male",
        dob: "1990-01-01",
        createdAt: Date.now(),
      });
      const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
      const fid = await ctx.storage.store(blob);
      const lrid = await ctx.db.insert("lab_reports", {
        userId: uid,
        source: "patient_upload",
        fileId: fid,
        mimeType: "application/pdf",
        fileSizeBytes: 1,
        contentHash: "x",
        status: "ready",
        createdAt: Date.now(),
      });
      const brid = await ctx.db.insert("biomarker_reports", {
        labReportId: lrid,
        userId: uid,
        narrative: "",
        narrativeModel: "",
        optimalCount: 1,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 0,
        analyzedAt: Date.now(),
      });
      // Value is already optimal AND the active range already covers it as optimal
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId: brid,
        userId: uid,
        canonicalId: "tsh",
        nameOnReport: "TSH",
        valueType: "numeric",
        rawValue: "3.0",
        numericValue: 3.0,
        status: "optimal",
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
        updatedAt: Date.now(),
      });
      return uid;
    });

    await t.action(
      internal.biomarker.reclassifyForCanonicalId.reclassifyForCanonicalId,
      { canonicalId: "tsh" },
    );

    const notifs = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(notifs.filter((n) => n.kind === "lab_report_updated").length).toBe(
      0,
    );
  });

  it("emits exactly one notification per affected report", async () => {
    const t = convexTest(schema, modules);
    const { userId, reportAId, reportBId } = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        gender: "male",
        dob: "1990-01-01",
        createdAt: Date.now(),
      });
      const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
      const fidA = await ctx.storage.store(blob);
      const fidB = await ctx.storage.store(blob);
      const lridA = await ctx.db.insert("lab_reports", {
        userId: uid,
        source: "patient_upload",
        fileId: fidA,
        mimeType: "application/pdf",
        fileSizeBytes: 1,
        contentHash: "a",
        status: "ready",
        createdAt: Date.now(),
      });
      const lridB = await ctx.db.insert("lab_reports", {
        userId: uid,
        source: "patient_upload",
        fileId: fidB,
        mimeType: "application/pdf",
        fileSizeBytes: 1,
        contentHash: "b",
        status: "ready",
        createdAt: Date.now(),
      });
      const bridA = await ctx.db.insert("biomarker_reports", {
        labReportId: lridA,
        userId: uid,
        narrative: "",
        narrativeModel: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 1,
        analyzedAt: Date.now(),
      });
      const bridB = await ctx.db.insert("biomarker_reports", {
        labReportId: lridB,
        userId: uid,
        narrative: "",
        narrativeModel: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 1,
        analyzedAt: Date.now(),
      });
      // Both reports have an unclassified TSH value. The active range below
      // will reclassify both to optimal — each report should get exactly one
      // notification (not one aggregated, not one per value).
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId: bridA,
        userId: uid,
        canonicalId: "tsh",
        nameOnReport: "TSH",
        valueType: "numeric",
        rawValue: "3.0",
        numericValue: 3.0,
        status: "unclassified",
        classifiedAt: Date.now(),
      });
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId: bridB,
        userId: uid,
        canonicalId: "tsh",
        nameOnReport: "TSH",
        valueType: "numeric",
        rawValue: "3.5",
        numericValue: 3.5,
        status: "unclassified",
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
        updatedAt: Date.now(),
      });
      return { userId: uid, reportAId: bridA, reportBId: bridB };
    });

    await t.action(
      internal.biomarker.reclassifyForCanonicalId.reclassifyForCanonicalId,
      { canonicalId: "tsh" },
    );

    const notifs = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", userId))
        .collect(),
    );
    const labUpdates = notifs.filter((n) => n.kind === "lab_report_updated");
    // Exactly N notifications for N affected reports — locks the contract:
    // one-notification-per-affected-report, NOT one-per-value, NOT aggregated.
    expect(labUpdates.length).toBe(2);
    const affectedReportIds = new Set(
      labUpdates.map((n) => n.biomarkerReportId),
    );
    expect(affectedReportIds.has(reportAId)).toBe(true);
    expect(affectedReportIds.has(reportBId)).toBe(true);
    // And each notification targets the correct user
    for (const n of labUpdates) {
      expect(n.userId).toBe(userId);
    }
  });
});
