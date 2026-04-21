// convex/biomarker/internal/classifyRow.ts
//
// Classification pipeline for a single extracted marker.
// Order (CRITICAL — do not reorder):
//   1. Pregnancy guard  — pregnancy-sensitive marker + unknown status → unclassified
//   2. Profile guard    — missing DOB → unclassified
//   3. Qualitative check — non-numeric raw_value → unclassified (for now)
//   4. Reference-range lookup — by canonicalId + sex + age. If no row → unclassified
//   5. Unit normalize — via normalizeUnit helper
//   6. Status assign — action_required | sub_optimal | optimal
//      Action bounds use ≤ (per docs/decisions/2026-04-18-biomarker-threshold-invariant.md)
//
// Pure function; the orchestrator persists the result.

import { normalizeUnit, type UnitConversion } from "./normalizeUnit";

export interface ExtractedMarker {
  name_on_report: string;
  canonical_id_guess: string | null;
  raw_value: string;
  raw_unit: string | null;
  lab_printed_range: string | null;
  page_number: number;
  confidence: number;
}

export interface ReferenceRange {
  canonicalId: string;
  displayName: string;
  category: string;
  canonicalUnit: string;
  ageMin: number;
  ageMax: number;
  sex: "male" | "female" | "any";
  pregnancySensitive: boolean;
  optimalMin: number;
  optimalMax: number;
  subOptimalBelowMin?: number;
  subOptimalAboveMax?: number;
  actionBelow?: number;
  actionAbove?: number;
  aliases?: string[];
}

export interface UserProfile {
  dob?: string; // ISO YYYY-MM-DD
  sex: "male" | "female" | "other";
  pregnancyStatus: "pregnant" | "not_pregnant" | "unknown";
}

export interface ClassifyInput {
  marker: ExtractedMarker;
  user: UserProfile;
  ranges: ReferenceRange[];
  conversions: UnitConversion[];
  // When the orchestrator has already resolved the canonical via a later
  // classification layer (fuzzy alias match, auto-DRAFT generation), pass
  // it here to bypass the marker.canonical_id_guess lookup.
  forcedCanonicalId?: string;
}

export type MarkerStatus =
  | "optimal"
  | "sub_optimal"
  | "action_required"
  | "unclassified";

export type UnclassifiedReason =
  | "not_in_reference_db"
  | "profile_incomplete"
  | "pregnancy_sensitive"
  | "qualitative_value"
  | "unit_conversion_missing";

export interface ClassifyResult {
  canonicalId: string | null;
  status: MarkerStatus;
  unclassifiedReason: UnclassifiedReason | null;
  valueType: "numeric" | "qualitative";
  numericValue: number | null;
  convertedValue: number | null;
  canonicalUnit: string | null;
  category: string | null;
  displayName: string | null;
  referenceRangeId: string | null; // Convex Id<"biomarker_reference_ranges"> — callers inject from lookup
}

function unclassified(
  reason: UnclassifiedReason,
  canonicalId: string | null,
  valueType: "numeric" | "qualitative" = "numeric",
): ClassifyResult {
  return {
    canonicalId,
    status: "unclassified",
    unclassifiedReason: reason,
    valueType,
    numericValue: null,
    convertedValue: null,
    canonicalUnit: null,
    category: null,
    displayName: null,
    referenceRangeId: null,
  };
}

export function classifyRow(input: ClassifyInput): ClassifyResult {
  const { marker, user, ranges, conversions, forcedCanonicalId } = input;
  const canonicalId = forcedCanonicalId ?? marker.canonical_id_guess;

  // 4a. Find the matching range ONCE to inform the pregnancy check
  const matchingRange = canonicalId
    ? findRange(ranges, canonicalId, user)
    : null;

  // 1. Pregnancy guard (uses the range to know if it's sensitive)
  if (
    matchingRange?.pregnancySensitive &&
    user.pregnancyStatus === "unknown" &&
    user.sex === "female"
  ) {
    return unclassified("pregnancy_sensitive", canonicalId);
  }

  // 2. Profile guard
  if (!user.dob) {
    return unclassified("profile_incomplete", canonicalId);
  }

  // 3. Qualitative check
  const normalized = normalizeUnit({
    rawValue: marker.raw_value,
    rawUnit: marker.raw_unit,
    canonicalId: matchingRange?.canonicalId ?? null,
    canonicalUnit: matchingRange?.canonicalUnit ?? null,
    conversions,
  });
  if (normalized.valueType === "qualitative") {
    return unclassified("qualitative_value", canonicalId, "qualitative");
  }

  // 4. Reference range
  if (!matchingRange) {
    return unclassified("not_in_reference_db", canonicalId);
  }

  // 5. Unit normalization bailout
  if (normalized.unclassifiedReason === "unit_conversion_missing") {
    return {
      canonicalId: matchingRange.canonicalId,
      status: "unclassified",
      unclassifiedReason: "unit_conversion_missing",
      valueType: "numeric",
      numericValue: normalized.numericValue,
      convertedValue: null,
      canonicalUnit: matchingRange.canonicalUnit,
      category: matchingRange.category,
      displayName: matchingRange.displayName,
      referenceRangeId: null,
    };
  }

  // 6. Status assign
  const value = normalized.convertedValue ?? normalized.numericValue!;
  const status = assignStatus(value, matchingRange);

  return {
    canonicalId: matchingRange.canonicalId,
    status,
    unclassifiedReason: null,
    valueType: "numeric",
    numericValue: normalized.numericValue,
    convertedValue: normalized.convertedValue,
    canonicalUnit: matchingRange.canonicalUnit,
    category: matchingRange.category,
    displayName: matchingRange.displayName,
    referenceRangeId: null, // orchestrator fills this from the DB lookup id
  };
}

function findRange(
  ranges: ReferenceRange[],
  canonicalId: string,
  user: UserProfile,
): ReferenceRange | null {
  if (!user.dob) return null;
  const age = computeAge(user.dob);

  // Prefer sex-specific, fall back to sex: "any"
  const sexMatches = ranges.filter(
    (r) =>
      r.canonicalId === canonicalId &&
      age >= r.ageMin &&
      age <= r.ageMax &&
      (r.sex === user.sex || r.sex === "any"),
  );
  // Preference: exact sex first
  return (
    sexMatches.find((r) => r.sex === user.sex) ??
    sexMatches.find((r) => r.sex === "any") ??
    null
  );
}

export function computeAge(dobIso: string): number {
  const dob = new Date(dobIso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function assignStatus(value: number, r: ReferenceRange): MarkerStatus {
  // Action bounds use ≤ (stricter wins — per docs/decisions/2026-04-18-biomarker-threshold-invariant.md)
  if (r.actionBelow !== undefined && value <= r.actionBelow) {
    return "action_required";
  }
  if (r.actionAbove !== undefined && value >= r.actionAbove) {
    return "action_required";
  }
  // Sub-optimal: strictly below optimalMin or strictly above optimalMax,
  // but not in action zone.
  if (value < r.optimalMin || value > r.optimalMax) {
    return "sub_optimal";
  }
  return "optimal";
}
