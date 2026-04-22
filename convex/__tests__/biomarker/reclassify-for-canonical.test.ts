/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function seedReportWithValue(
  t: ReturnType<typeof convexTest>,
  opts: {
    canonicalId: string;
    currentStatus:
      | "optimal"
      | "sub_optimal"
      | "action_required"
      | "unclassified";
    numericValue?: number;
  },
) {
  return await t.run(async (ctx) => {
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
      narrative: "test",
      narrativeModel: "test",
      optimalCount: 0,
      subOptimalCount: 0,
      actionRequiredCount: 0,
      unclassifiedCount: 1,
      analyzedAt: Date.now(),
    });
    const valueId = await ctx.db.insert("biomarker_values", {
      biomarkerReportId,
      userId,
      canonicalId: opts.canonicalId,
      nameOnReport: opts.canonicalId,
      valueType: "numeric",
      rawValue: String(opts.numericValue ?? 5.0),
      numericValue: opts.numericValue ?? 5.0,
      status: opts.currentStatus,
      classifiedAt: Date.now(),
    });
    // Active reference range making 5.0 optimal
    await ctx.db.insert("biomarker_reference_ranges", {
      canonicalId: opts.canonicalId,
      displayName: opts.canonicalId,
      aliases: [],
      category: "Thyroid",
      canonicalUnit: "mIU/L",
      ageMin: 18,
      ageMax: 120,
      sex: "any",
      pregnancySensitive: false,
      optimalMin: 4.0,
      optimalMax: 6.0,
      explainer: "",
      source: "test",
      isActive: true,
      updatedAt: Date.now(),
    });
    return { userId, labReportId, biomarkerReportId, valueId };
  });
}

describe("reclassifyForCanonicalId", () => {
  it("flips unclassified value to optimal when range now covers numeric value", async () => {
    const t = convexTest(schema, modules);
    const { biomarkerReportId, valueId } = await seedReportWithValue(t, {
      canonicalId: "tsh",
      currentStatus: "unclassified",
      numericValue: 5.0,
    });
    await t.action(
      internal.biomarker.reclassifyForCanonicalId.reclassifyForCanonicalId,
      { canonicalId: "tsh" },
    );
    const value = await t.run(async (ctx) => ctx.db.get(valueId));
    expect(value?.status).toBe("optimal");
    const report = await t.run(async (ctx) => ctx.db.get(biomarkerReportId));
    expect(report?.optimalCount).toBe(1);
    expect(report?.unclassifiedCount).toBe(0);
    expect(report?.lastReclassifiedAt).toBeDefined();
  });

  it("emits lab_report_updated notification on band change", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedReportWithValue(t, {
      canonicalId: "tsh",
      currentStatus: "unclassified",
      numericValue: 5.0,
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
      1,
    );
  });

  it("no-op reclassify (all values already match current range) emits NO notification", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seedReportWithValue(t, {
      canonicalId: "tsh",
      currentStatus: "optimal",
      numericValue: 5.0,
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

  it("throws reclassify_in_progress when lock is held", async () => {
    const t = convexTest(schema, modules);
    await seedReportWithValue(t, {
      canonicalId: "tsh",
      currentStatus: "unclassified",
      numericValue: 5.0,
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("reclassify_locks", {
        canonicalId: "tsh",
        ownerToken: "held",
        acquiredAt: Date.now(),
        expiresAt: Date.now() + 300_000,
        action: "reclassifyForCanonicalId",
      });
    });
    await expect(
      t.action(
        internal.biomarker.reclassifyForCanonicalId.reclassifyForCanonicalId,
        { canonicalId: "tsh" },
      ),
    ).rejects.toThrow(/reclassify_in_progress/);
  });
});
