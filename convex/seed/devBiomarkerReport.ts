// convex/seed/devBiomarkerReport.ts
//
// Dev-only seed helper: inserts a synthetic lab_report → biomarker_report →
// biomarker_values chain for Arjun Sharma, for Phase 2.5D live-E2E
// verification of the patient biomarker dashboard.
//
// Entry points (run from the Convex dashboard against the dev deployment):
//   seed/devBiomarkerReport:seedArjunReport   — args: {}  →  insert chain
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

// Mix of statuses so the dashboard visually exercises optimal / sub_optimal
// / action_required colorways. Each canonicalId must exist in the
// biomarker_reference_ranges table for the canonical join to succeed.
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

export const insertReport = internalMutation({
  args: {
    userId: v.id("users"),
    fileId: v.id("_storage"),
    rangeIdPairs: v.array(
      v.object({
        canonicalId: v.string(),
        rangeId: v.id("biomarker_reference_ranges"),
      }),
    ),
  },
  handler: async (ctx, { userId, fileId, rangeIdPairs }) => {
    assertNotProd();

    const rangeIdByCanonical: Record<
      string,
      Id<"biomarker_reference_ranges">
    > = {};
    for (const p of rangeIdPairs) {
      rangeIdByCanonical[p.canonicalId] = p.rangeId;
    }

    const now = Date.now();

    const labReportId = await ctx.db.insert("lab_reports", {
      userId,
      source: "patient_upload",
      fileId,
      mimeType: "application/pdf",
      fileSizeBytes: 4,
      contentHash: `${SEED_CONTENT_HASH_PREFIX}${now}`,
      collectionDate: "2026-04-10",
      patientNameOnReport: "Arjun Sharma",
      patientNameMatch: "match",
      status: "ready",
      createdAt: now,
    });

    const counts = SEED_VALUES.reduce(
      (acc, v) => {
        if (v.status === "optimal") acc.optimal += 1;
        else if (v.status === "sub_optimal") acc.sub += 1;
        else if (v.status === "action_required") acc.action += 1;
        return acc;
      },
      { optimal: 0, sub: 0, action: 0 },
    );

    const biomarkerReportId = await ctx.db.insert("biomarker_reports", {
      labReportId,
      userId,
      collectionDate: "2026-04-10",
      narrative: `${SEED_MARKER} Synthetic lab panel for Phase 2.5D live-E2E verification. Overall profile is mostly healthy with two markers worth attention: LDL cholesterol is elevated (165 mg/dL) and Vitamin D is low (22 ng/mL). HDL sits on the borderline. Consider dietary tweaks and sunlight exposure.`,
      narrativeModel: "dev-seed",
      optimalCount: counts.optimal,
      subOptimalCount: counts.sub,
      actionRequiredCount: counts.action,
      unclassifiedCount: 0,
      analyzedAt: now,
    });

    for (const val of SEED_VALUES) {
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId,
        userId,
        collectionDate: "2026-04-10",
        canonicalId: val.canonicalId,
        normalizedKey: val.canonicalId,
        nameOnReport: val.nameOnReport,
        valueType: "numeric",
        rawValue: String(val.numericValue),
        numericValue: val.numericValue,
        rawUnit: val.rawUnit,
        canonicalUnit: val.rawUnit,
        convertedValue: val.numericValue,
        status: val.status,
        referenceRangeId: rangeIdByCanonical[val.canonicalId],
        classifiedAt: now,
      });
    }

    return {
      labReportId,
      biomarkerReportId,
      valuesCreated: SEED_VALUES.length,
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

    const canonicalIds = SEED_VALUES.map((v) => v.canonicalId);
    const rangeIdPairs = await ctx.runQuery(
      internal.seed.devBiomarkerReport.findRangeIds,
      { canonicalIds },
    );
    const foundCanonicals = new Set(rangeIdPairs.map((p) => p[0]));
    const missing = canonicalIds.filter((c) => !foundCanonicals.has(c));
    if (missing.length > 0) {
      throw new ConvexError({
        code: "reference_ranges_missing",
        message: `Reference ranges missing for: ${missing.join(", ")}. Run the biomarker reference-range seeder first.`,
      });
    }

    const fakePdfBytes = new Uint8Array([37, 80, 68, 70]);
    const blob = new Blob([fakePdfBytes], { type: "application/pdf" });
    const fileId = await ctx.storage.store(blob);

    return await ctx.runMutation(
      internal.seed.devBiomarkerReport.insertReport,
      {
        userId: arjun._id,
        fileId,
        rangeIdPairs: rangeIdPairs.map(([canonicalId, rangeId]) => ({
          canonicalId,
          rangeId,
        })),
      },
    );
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
