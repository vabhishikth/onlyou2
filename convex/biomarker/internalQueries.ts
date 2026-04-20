import { v } from "convex/values";

import { internalQuery } from "../_generated/server";

import type { ReferenceRange } from "./internal/classifyRow";

export const getLabReportById = internalQuery({
  args: { labReportId: v.id("lab_reports") },
  handler: async (ctx, { labReportId }) => ctx.db.get(labReportId),
});

export const getUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const u = await ctx.db.get(userId);
    if (!u) throw new Error("User not found");
    return {
      name: u.name,
      dob: u.dob,
      sex: (u.gender ?? "other") as "male" | "female" | "other",
      pregnancyStatus: (u.pregnancyStatus ?? "unknown") as
        | "pregnant"
        | "not_pregnant"
        | "unknown",
    };
  },
});

export const getActiveRanges = internalQuery({
  args: {},
  handler: async (ctx): Promise<ReferenceRange[]> => {
    const rows = await ctx.db
      .query("biomarker_reference_ranges")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return rows.map((r) => ({
      canonicalId: r.canonicalId,
      displayName: r.displayName,
      category: r.category,
      canonicalUnit: r.canonicalUnit,
      ageMin: r.ageMin,
      ageMax: r.ageMax,
      sex: r.sex,
      pregnancySensitive: r.pregnancySensitive,
      optimalMin: r.optimalMin,
      optimalMax: r.optimalMax,
      subOptimalBelowMin: r.subOptimalBelowMin,
      subOptimalAboveMax: r.subOptimalAboveMax,
      actionBelow: r.actionBelow,
      actionAbove: r.actionAbove,
    }));
  },
});

export const getUnitConversions = internalQuery({
  args: {},
  handler: async () => {
    // Static import; conversions are data, not schema.
    // JSON uses rawUnitPattern/canonicalUnit; normalizeUnit expects from/to.
    const raw = (
      await import("../../packages/core/seeds/unit-conversions.json")
    ).default as Array<{
      canonicalId: string;
      rawUnitPattern: string;
      canonicalUnit: string;
      factor: number;
    }>;
    return raw.map((r) => ({
      from: r.rawUnitPattern,
      to: r.canonicalUnit,
      canonicalId: r.canonicalId,
      factor: r.factor,
    }));
  },
});

export const findReferenceRangeId = internalQuery({
  args: { canonicalId: v.string(), sex: v.string(), age: v.number() },
  handler: async (ctx, { canonicalId, sex, age }) => {
    const rows = await ctx.db
      .query("biomarker_reference_ranges")
      .withIndex("by_canonical_id", (q) => q.eq("canonicalId", canonicalId))
      .collect();
    const m = rows.find(
      (r) =>
        r.isActive &&
        age >= r.ageMin &&
        age <= r.ageMax &&
        (r.sex === sex || r.sex === "any"),
    );
    return m?._id ?? null;
  },
});

export const getBiomarkerReportByLabReport = internalQuery({
  args: { labReportId: v.id("lab_reports") },
  handler: async (ctx, { labReportId }) =>
    await ctx.db
      .query("biomarker_reports")
      .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
      .first(),
});

export const isBiomarkerParsingEnabled = internalQuery({
  args: {},
  handler: async (ctx) => {
    const f = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", "BIOMARKER_PARSING_ENABLED"))
      .first();
    return f?.value ?? true; // default on
  },
});

export const findRetryCandidates = internalQuery({
  args: { now: v.number(), staleLockCutoff: v.number() },
  handler: async (ctx, { now, staleLockCutoff }) => {
    return await ctx.db
      .query("lab_reports")
      .withIndex("by_next_retry", (q) => q.lte("nextRetryAt", now))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "analyzing"),
          q.or(
            q.eq(q.field("lockedAt"), undefined),
            q.lt(q.field("lockedAt"), staleLockCutoff),
          ),
        ),
      )
      .take(25); // batch cap
  },
});
