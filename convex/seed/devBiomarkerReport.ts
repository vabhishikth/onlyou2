// convex/seed/devBiomarkerReport.ts
//
// Dev-only seed helpers: insert synthetic lab_report → biomarker_report →
// biomarker_values chains for Arjun Sharma, for Phase 2.5D/E live-E2E
// verification of the patient biomarker dashboard (including trends).
//
// Entry points (run from the Convex dashboard against the dev deployment):
//   seed/devBiomarkerReport:seedArjunReport   — args: {}  →  insert single chain
//   seed/devBiomarkerReport:seedArjunHistory  — args: {reports, spacingDays}
//       → insert N chains spaced by `spacingDays`, oldest first, drifting
//         toward a fresh/healthier most-recent report so trends look real.
//   seed/devBiomarkerReport:clearArjunReports — args: {}  →  wipe seeded chain
//
// Pre-requisites:
//   1. seed/fakeUsers:seedFakeUsers has been run (creates Arjun).
//   2. biomarker reference ranges seeded (required for canonical join).
//
// Prod guard: assertNotProd() on every mutation + action.

import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { assertNotProd } from "../admin";

const ARJUN_PHONE = "+91 99999 00001";
const SEED_MARKER = "[DEV SEED]";
const SEED_CONTENT_HASH_PREFIX = "dev-seed-";

// Single-report marker set preserved for seedArjunReport. Mix of statuses so
// the dashboard visually exercises optimal / sub_optimal / action_required
// colorways. Each canonicalId must exist in the biomarker_reference_ranges
// table for the canonical join to succeed.
const SEED_VALUES: Array<{
  canonicalId: string;
  nameOnReport: string;
  numericValue: number;
  rawUnit: string;
  status: "optimal" | "sub_optimal" | "action_required";
}> = [
  {
    canonicalId: "total_cholesterol",
    nameOnReport: "Total Cholesterol",
    numericValue: 185,
    rawUnit: "mg/dL",
    status: "optimal",
  },
  {
    canonicalId: "hdl_cholesterol",
    nameOnReport: "HDL Cholesterol",
    numericValue: 38,
    rawUnit: "mg/dL",
    status: "sub_optimal",
  },
  {
    canonicalId: "ldl_cholesterol",
    nameOnReport: "LDL Cholesterol",
    numericValue: 165,
    rawUnit: "mg/dL",
    status: "action_required",
  },
  {
    canonicalId: "hemoglobin",
    nameOnReport: "Hemoglobin",
    numericValue: 14.2,
    rawUnit: "g/dL",
    status: "optimal",
  },
  {
    canonicalId: "vitamin_d",
    nameOnReport: "Vitamin D (25-OH)",
    numericValue: 22,
    rawUnit: "ng/mL",
    status: "sub_optimal",
  },
];

// History drift spec for seedArjunHistory. Earliest report = start + drift *
// (reports - 1); newest = start exactly (fresh). Statuses are computed from
// reference ranges in seedOneReport so the dashboard trend arrows are real.
const HISTORY_MARKERS: Array<{
  canonicalId: string;
  nameOnReport: string;
  rawUnit: string;
  start: number;
  drift: number;
}> = [
  {
    canonicalId: "ldl_cholesterol",
    nameOnReport: "LDL Cholesterol",
    rawUnit: "mg/dL",
    start: 95,
    drift: 10,
  },
  {
    canonicalId: "hdl_cholesterol",
    nameOnReport: "HDL Cholesterol",
    rawUnit: "mg/dL",
    start: 58,
    drift: -2,
  },
  {
    canonicalId: "triglycerides",
    nameOnReport: "Triglycerides",
    rawUnit: "mg/dL",
    start: 110,
    drift: 15,
  },
  {
    canonicalId: "vitamin_d",
    nameOnReport: "Vitamin D (25-OH)",
    rawUnit: "ng/mL",
    start: 32,
    drift: -3,
  },
  {
    canonicalId: "hba1c",
    nameOnReport: "HbA1c",
    rawUnit: "%",
    start: 5.2,
    drift: 0.1,
  },
];

export const findArjun = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", ARJUN_PHONE))
      .unique();
  },
});

export const findRangeIds = internalQuery({
  args: { canonicalIds: v.array(v.string()) },
  handler: async (ctx, { canonicalIds }) => {
    const pairs: Array<[string, Id<"biomarker_reference_ranges">]> = [];
    for (const cid of canonicalIds) {
      const row = await ctx.db
        .query("biomarker_reference_ranges")
        .withIndex("by_canonical_id", (q) => q.eq("canonicalId", cid))
        .first();
      if (row) pairs.push([cid, row._id]);
    }
    return pairs;
  },
});

// Internal mutation: insert a single seeded chain (lab_report +
// biomarker_report + biomarker_values). Status per marker is classified
// from the reference-range row so trend arrows reflect real thresholds.
//
// Callers must pre-stage a storage fileId (mutations cannot call
// ctx.storage.store) and provide the canonicalId set.
export const seedOneReport = internalMutation({
  args: {
    userId: v.id("users"),
    fileId: v.id("_storage"),
    collectionDate: v.string(),
    markers: v.array(
      v.object({
        canonicalId: v.string(),
        name: v.string(),
        unit: v.string(),
        value: v.number(),
      }),
    ),
  },
  handler: async (ctx, { userId, fileId, collectionDate, markers }) => {
    assertNotProd();

    const now = Date.now();

    const labReportId = await ctx.db.insert("lab_reports", {
      userId,
      source: "patient_upload",
      fileId,
      mimeType: "application/pdf",
      fileSizeBytes: 4,
      contentHash: `${SEED_CONTENT_HASH_PREFIX}${now}-${collectionDate}`,
      collectionDate,
      patientNameOnReport: "Arjun Sharma",
      patientNameMatch: "match",
      status: "ready",
      createdAt: now,
    });

    // Resolve ranges + classify statuses per marker.
    const classified: Array<{
      canonicalId: string;
      name: string;
      unit: string;
      value: number;
      status: "optimal" | "sub_optimal" | "action_required";
      rangeId: Id<"biomarker_reference_ranges">;
    }> = [];

    for (const m of markers) {
      const range = await ctx.db
        .query("biomarker_reference_ranges")
        .withIndex("by_canonical_id", (q) => q.eq("canonicalId", m.canonicalId))
        .first();
      if (!range) {
        throw new ConvexError({
          code: "reference_range_missing",
          message: `Reference range missing for canonicalId=${m.canonicalId}. Run the biomarker reference-range seeder first.`,
        });
      }

      let status: "optimal" | "sub_optimal" | "action_required" = "optimal";
      const v = m.value;
      if (
        (range.actionBelow !== undefined && v <= range.actionBelow) ||
        (range.actionAbove !== undefined && v >= range.actionAbove)
      ) {
        status = "action_required";
      } else if (v < range.optimalMin || v > range.optimalMax) {
        status = "sub_optimal";
      }

      classified.push({
        canonicalId: m.canonicalId,
        name: m.name,
        unit: m.unit,
        value: m.value,
        status,
        rangeId: range._id,
      });
    }

    const counts = classified.reduce(
      (acc, c) => {
        if (c.status === "optimal") acc.optimal += 1;
        else if (c.status === "sub_optimal") acc.sub += 1;
        else if (c.status === "action_required") acc.action += 1;
        return acc;
      },
      { optimal: 0, sub: 0, action: 0 },
    );

    const biomarkerReportId = await ctx.db.insert("biomarker_reports", {
      labReportId,
      userId,
      collectionDate,
      narrative: `${SEED_MARKER} Synthetic lab panel for live-E2E verification (collectionDate=${collectionDate}). ${counts.optimal} optimal / ${counts.sub} sub-optimal / ${counts.action} action-required.`,
      narrativeModel: "dev-seed",
      optimalCount: counts.optimal,
      subOptimalCount: counts.sub,
      actionRequiredCount: counts.action,
      unclassifiedCount: 0,
      analyzedAt: now,
    });

    for (const c of classified) {
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId,
        userId,
        collectionDate,
        canonicalId: c.canonicalId,
        normalizedKey: c.canonicalId,
        nameOnReport: c.name,
        valueType: "numeric",
        rawValue: String(c.value),
        numericValue: c.value,
        rawUnit: c.unit,
        canonicalUnit: c.unit,
        convertedValue: c.value,
        status: c.status,
        referenceRangeId: c.rangeId,
        classifiedAt: now,
      });
    }

    return {
      labReportId,
      biomarkerReportId,
      valuesCreated: classified.length,
    };
  },
});

export const seedArjunReport = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    labReportId: Id<"lab_reports">;
    biomarkerReportId: Id<"biomarker_reports">;
    valuesCreated: number;
  }> => {
    assertNotProd();

    const arjun = await ctx.runQuery(
      internal.seed.devBiomarkerReport.findArjun,
      {},
    );
    if (!arjun) {
      throw new ConvexError({
        code: "arjun_not_found",
        message:
          "Arjun fixture user missing. Run seed/fakeUsers:seedFakeUsers first.",
      });
    }

    const fakePdfBytes = new Uint8Array([37, 80, 68, 70]);
    const blob = new Blob([fakePdfBytes], { type: "application/pdf" });
    const fileId = await ctx.storage.store(blob);

    return await ctx.runMutation(
      internal.seed.devBiomarkerReport.seedOneReport,
      {
        userId: arjun._id,
        fileId,
        collectionDate: "2026-04-10",
        markers: SEED_VALUES.map((v) => ({
          canonicalId: v.canonicalId,
          name: v.nameOnReport,
          unit: v.rawUnit,
          value: v.numericValue,
        })),
      },
    );
  },
});

// Multi-report history for trend E2E. Inserts `reports` chains, each
// `spacingDays` apart, with markers drifting from "stale/worse" at the
// oldest report to "fresh/best" at the newest (formula: start + drift *
// (reports - 1 - i) where i=0 is oldest, i=reports-1 is newest).
export const seedArjunHistory = internalAction({
  args: {
    reports: v.number(),
    spacingDays: v.number(),
  },
  handler: async (
    ctx,
    { reports, spacingDays },
  ): Promise<{
    inserted: number;
    biomarkerReportIds: Id<"biomarker_reports">[];
  }> => {
    assertNotProd();

    const arjun = await ctx.runQuery(internal.users.getUserByPhone, {
      phone: ARJUN_PHONE,
    });
    if (!arjun) {
      throw new ConvexError({
        code: "arjun_not_found",
        message:
          "Arjun fixture user missing. Run seed/fakeUsers:seedFakeUsers first.",
      });
    }

    const now = Date.now();
    const biomarkerReportIds: Id<"biomarker_reports">[] = [];

    // Iterate oldest-first so inserted order matches chronological order.
    for (let i = reports - 1; i >= 0; i--) {
      const collectionDate = new Date(
        now - i * spacingDays * 86_400_000,
      ).toISOString();

      const markers = HISTORY_MARKERS.map((m) => ({
        canonicalId: m.canonicalId,
        name: m.nameOnReport,
        unit: m.rawUnit,
        value: Number((m.start + m.drift * (reports - 1 - i)).toFixed(2)),
      }));

      // Each report needs a distinct storage file (content hash uniqueness).
      const fakePdfBytes = new Uint8Array([37, 80, 68, 70]);
      const blob = new Blob([fakePdfBytes], { type: "application/pdf" });
      const fileId = await ctx.storage.store(blob);

      const result = await ctx.runMutation(
        internal.seed.devBiomarkerReport.seedOneReport,
        {
          userId: arjun._id,
          fileId,
          collectionDate,
          markers,
        },
      );
      biomarkerReportIds.push(result.biomarkerReportId);
    }

    return { inserted: biomarkerReportIds.length, biomarkerReportIds };
  },
});

export const clearArjunReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertNotProd();

    const arjun = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", ARJUN_PHONE))
      .unique();
    if (!arjun) {
      return { clearedReports: 0, clearedValues: 0, clearedLabReports: 0 };
    }

    let clearedReports = 0;
    let clearedValues = 0;
    let clearedLabReports = 0;

    const reports = await ctx.db
      .query("biomarker_reports")
      .withIndex("by_user_analyzed", (q) => q.eq("userId", arjun._id))
      .collect();

    for (const r of reports) {
      if (!r.narrative.startsWith(SEED_MARKER)) continue;

      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", r._id))
        .collect();
      for (const val of values) {
        await ctx.db.delete(val._id);
        clearedValues += 1;
      }
      await ctx.db.delete(r._id);
      clearedReports += 1;

      const lr = await ctx.db.get(r.labReportId);
      if (lr && lr.contentHash.startsWith(SEED_CONTENT_HASH_PREFIX)) {
        await ctx.db.delete(lr._id);
        clearedLabReports += 1;
      }
    }

    return { clearedReports, clearedValues, clearedLabReports };
  },
});
