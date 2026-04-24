/**
 * useBiomarkerReports — fetches the patient's biomarker reports from Convex
 * and transforms the response into BiomarkerMock[] for Dashboard/Detail.
 *
 * Default behaviour (Phase 2.5D):
 *   - In __DEV__ and when EXPO_PUBLIC_USE_MOCK_BIOMARKERS is not explicitly
 *     "0", the hook returns BIOMARKERS_MOCK so demos always look great.
 *   - Set EXPO_PUBLIC_USE_MOCK_BIOMARKERS=0 in .env.local to opt into real
 *     Convex data (requires a seeded patient with lab reports).
 *
 * Known gaps deferred to later phases:
 *   - Reference ranges (low/high/optLow/optHigh): placeholder 0/100/25/75.
 *     DEFERRED: Phase 3 — personalised ranges join with patient profile.
 *   - Trend data: single-point array [currentValue].
 *     DEFERRED: Phase 3 — multi-report historical trend query.
 *   - prev value: mirrors current value (no prior report joined yet).
 *     DEFERRED: Phase 3 — prior-report join.
 *
 * Category mapping: seed data uses Title Case names that differ from the
 * UI's 7-cat enum. The mapCategory function bridges both.
 */

import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { type BiomarkerStatus } from "../components/biomarker/status-helpers";
import {
  type BiomarkerMock,
  type CategoryId,
  BIOMARKERS_MOCK,
} from "../data/biomarker-mock";
import { useAuthStore } from "../stores/auth-store";

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface UseBiomarkerReportsResult {
  isLoading: boolean;
  isEmpty: boolean;
  isError: boolean;
  rows: BiomarkerMock[];
}

// ---------------------------------------------------------------------------
// Category mapping: biomarker_reference_ranges.category → UI CategoryId
//
// Seed data categories (from packages/core/seeds/biomarker-ranges.json):
//   'CBC', 'Hormonal Balance', 'Kidney', 'Lipids', 'Liver',
//   'Metabolic', 'Nutrient Health', 'Thyroid'
//
// UI CategoryId enum: 'Metabolic'|'Lipids'|'Hormones'|'Inflammation'|
//                     'Vitamins'|'Organ'|'Blood'
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, CategoryId> = {
  // Exact matches from seed data
  Metabolic: "Metabolic",
  Lipids: "Lipids",
  // Seed → UI mappings
  "Hormonal Balance": "Hormones",
  Thyroid: "Hormones",
  CBC: "Blood",
  "Nutrient Health": "Vitamins",
  Liver: "Organ",
  Kidney: "Organ",
  // Lowercase variants (defensive — some older entries may be lowercase)
  metabolic: "Metabolic",
  lipids: "Lipids",
  hormones: "Hormones",
  "hormonal balance": "Hormones",
  thyroid: "Hormones",
  cbc: "Blood",
  blood: "Blood",
  "nutrient health": "Vitamins",
  vitamins: "Vitamins",
  liver: "Organ",
  kidney: "Organ",
  organ: "Organ",
  inflammation: "Inflammation",
  Inflammation: "Inflammation",
};

function mapCategory(category: string | undefined): CategoryId {
  if (!category) return "Metabolic"; // safe default
  return CATEGORY_MAP[category] ?? "Metabolic";
}

// ---------------------------------------------------------------------------
// Status mapping: Convex markerStatus → BiomarkerStatus (direction-aware)
//
// Convex schema:  'optimal' | 'sub_optimal' | 'action_required' | 'unclassified'
// UI status type: 'optimal' | 'watch'       | 'high'/'low'      | 'watch'
//
// action_required is disambiguated into 'low' vs 'high' by comparing the
// value against the joined reference range's optimalMin.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types representing entries in the Convex query response
// ---------------------------------------------------------------------------

type ConvexRange = {
  optimalMin: number;
  optimalMax: number;
  actionBelow: number | null;
  actionAbove: number | null;
} | null;

type ConvexTrendPoint = { value: number; collectionDate: string };

type ConvexValue = {
  _id: string;
  canonicalId?: string;
  nameOnReport: string;
  valueType: "numeric" | "qualitative";
  rawValue: string;
  rawUnit?: string;
  numericValue?: number;
  status: "optimal" | "sub_optimal" | "action_required" | "unclassified";
  classifiedAt: number;
  canonical: {
    _id: string;
    displayName: string;
    category: string;
    canonicalUnit: string;
  } | null;
  range: ConvexRange;
  trend: ConvexTrendPoint[];
  prev: ConvexTrendPoint | null;
};

type ConvexReport = {
  report: {
    _id: string;
    userId: string;
    labReportId: string;
    narrative: string;
    optimalCount: number;
    subOptimalCount: number;
    actionRequiredCount: number;
    unclassifiedCount: number;
    analyzedAt: number;
  };
  values: ConvexValue[];
};

function mapStatusDirection(
  status: ConvexValue["status"],
  value: number,
  r: ConvexRange,
): BiomarkerStatus {
  if (status === "optimal") return "optimal";
  if (status === "sub_optimal" || status === "unclassified") return "watch";
  if (r && value < r.optimalMin) return "low";
  return "high";
}

// ---------------------------------------------------------------------------
// Transform: Convex response → BiomarkerMock[]
// ---------------------------------------------------------------------------

function transform(data: ConvexReport[]): BiomarkerMock[] {
  // Dashboard shows current state only — take the most-recent report.
  // Reports from the query come in insertion order; sort defensively.
  const sorted = [...data].sort(
    (a, b) => b.report.analyzedAt - a.report.analyzedAt,
  );
  const current = sorted[0];
  if (!current) return [];

  const rows: BiomarkerMock[] = [];
  for (const v of current.values) {
    if (!v.canonical && v.status === "unclassified") continue;

    const numericVal = v.numericValue ?? 0;
    const r = v.range;
    const optLow = r?.optimalMin ?? 25;
    const optHigh = r?.optimalMax ?? 75;
    const span = optHigh - optLow;
    const low = r?.actionBelow ?? Math.max(0, optLow - span);
    const high = r?.actionAbove ?? optHigh + span;

    const rangeDirection: BiomarkerMock["rangeDirection"] =
      r?.actionBelow == null && r?.actionAbove != null
        ? "unboundedLow"
        : r?.actionBelow != null && r?.actionAbove == null
          ? "unboundedHigh"
          : "bidirectional";

    const trend =
      v.trend.length > 1 ? v.trend.map((p) => p.value) : [numericVal];
    const status = mapStatusDirection(v.status, numericVal, r);

    rows.push({
      id: v.canonicalId ?? v._id,
      name: v.canonical?.displayName ?? v.nameOnReport,
      cat: mapCategory(v.canonical?.category),
      unit: v.canonical?.canonicalUnit ?? v.rawUnit ?? "",
      value: numericVal,
      low,
      high,
      optLow,
      optHigh,
      trend,
      status,
      prev: v.prev?.value ?? numericVal,
      rangeDirection,
    });
  }
  return rows;
}

// Test-only export.
export const transformForTest = transform;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBiomarkerReports(): UseBiomarkerReportsResult {
  const token = useAuthStore((s) => s.token);

  // Default: mock in __DEV__ unless explicitly opted out.
  // Production (non-DEV) always uses real data when a token is present.
  const useMock =
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    process.env.EXPO_PUBLIC_USE_MOCK_BIOMARKERS !== "0";

  const data = useQuery(
    api.biomarker.patient.myBiomarkerReports.myBiomarkerReports,
    useMock || !token ? "skip" : { token },
  );

  if (useMock) {
    return {
      isLoading: false,
      isEmpty: false,
      isError: false,
      rows: BIOMARKERS_MOCK,
    };
  }

  if (!token) {
    // Not signed in — show empty state rather than loading forever.
    return { isLoading: false, isEmpty: true, isError: false, rows: [] };
  }

  if (data === undefined) {
    // Query in flight.
    return { isLoading: true, isEmpty: false, isError: false, rows: [] };
  }

  const rows = transform(data as ConvexReport[]);
  return {
    isLoading: false,
    isEmpty: rows.length === 0,
    isError: false,
    rows,
  };
}
