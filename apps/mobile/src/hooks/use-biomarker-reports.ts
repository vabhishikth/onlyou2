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
// Status mapping: Convex markerStatus → BiomarkerStatus
//
// Convex schema:  'optimal' | 'sub_optimal' | 'action_required' | 'unclassified'
// UI status type: 'optimal' | 'watch'       | 'high'/'low'      | 'watch'
//
// Note: Convex does not distinguish high vs low in status — it uses
// action_required for both. We map action_required → 'high' as a safe
// display default. The low/high distinction becomes available when we join
// reference ranges in Phase 3.
// ---------------------------------------------------------------------------

function mapStatus(
  status: "optimal" | "sub_optimal" | "action_required" | "unclassified",
): BiomarkerStatus {
  switch (status) {
    case "optimal":
      return "optimal";
    case "sub_optimal":
      return "watch";
    case "action_required":
      return "high";
    case "unclassified":
      return "watch";
  }
}

// ---------------------------------------------------------------------------
// Type representing one entry in the Convex query response
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Transform: Convex response → BiomarkerMock[]
//
// Placeholder gaps documented above; deferred to Phase 3.
// ---------------------------------------------------------------------------

function transform(data: ConvexReport[]): BiomarkerMock[] {
  const rows: BiomarkerMock[] = [];
  for (const { values } of data) {
    for (const v of values) {
      // Skip unclassified markers that have no canonical info — they have no
      // name or category to display meaningfully.
      if (!v.canonical && v.status === "unclassified") continue;

      const numericVal = v.numericValue ?? 0;
      rows.push({
        id: v._id,
        name: v.canonical?.displayName ?? v.nameOnReport,
        cat: mapCategory(v.canonical?.category),
        unit: v.canonical?.canonicalUnit ?? v.rawUnit ?? "",
        value: numericVal,
        // DEFERRED(phase-3): real ranges from biomarker_reference_ranges join
        low: 0,
        high: 100,
        optLow: 25,
        optHigh: 75,
        // DEFERRED(phase-3): multi-point trend from historical query
        trend: [numericVal],
        status: mapStatus(v.status),
        // DEFERRED(phase-3): prior-report join
        prev: numericVal,
      });
    }
  }
  return rows;
}

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
