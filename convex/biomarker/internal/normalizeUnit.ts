// convex/biomarker/internal/normalizeUnit.ts
//
// Pure function. Given a raw value + unit + canonical target, returns the
// parsed numeric + converted value (or null if the unit can't be converted).
//
// Qualitative values ("Non-reactive", "1+", "trace") return valueType:
// "qualitative" and null numeric/converted fields — the classifier then
// handles them via string match against the reference row's optimal set
// (future — not in scope for 2.5B).

export interface UnitConversion {
  from: string;
  to: string;
  canonicalId: string;
  factor: number;
}

export interface NormalizeInput {
  rawValue: string;
  rawUnit: string | null;
  canonicalId: string | null;
  canonicalUnit: string | null;
  conversions: UnitConversion[];
}

export interface NormalizeResult {
  valueType: "numeric" | "qualitative";
  numericValue: number | null;
  qualifier: string | null; // "<", ">", or null
  canonicalUnit: string | null;
  convertedValue: number | null;
  unclassifiedReason: "unit_conversion_missing" | null;
}

const NUMERIC_RE = /^\s*(?<qualifier>[<>])?\s*(?<num>[0-9,]+(?:\.[0-9]+)?)\s*$/;

export function normalizeUnit(input: NormalizeInput): NormalizeResult {
  const trimmed = input.rawValue.trim();
  const match = trimmed.match(NUMERIC_RE);

  // Qualitative short-circuit
  if (!match) {
    return {
      valueType: "qualitative",
      numericValue: null,
      qualifier: null,
      canonicalUnit: null,
      convertedValue: null,
      unclassifiedReason: null,
    };
  }

  const qualifier = match.groups?.qualifier ?? null;
  const numericStr = match.groups?.num?.replace(/,/g, "") ?? "";
  const numericValue = Number.parseFloat(numericStr);

  if (Number.isNaN(numericValue)) {
    return {
      valueType: "qualitative",
      numericValue: null,
      qualifier: null,
      canonicalUnit: null,
      convertedValue: null,
      unclassifiedReason: null,
    };
  }

  // No canonical target → nothing to convert against
  if (!input.canonicalId || !input.canonicalUnit) {
    return {
      valueType: "numeric",
      numericValue,
      qualifier,
      canonicalUnit: input.rawUnit,
      convertedValue: numericValue,
      unclassifiedReason: null,
    };
  }

  // Unit matches canonical — no conversion needed
  if (input.rawUnit === input.canonicalUnit || input.rawUnit === null) {
    return {
      valueType: "numeric",
      numericValue,
      qualifier,
      canonicalUnit: input.canonicalUnit,
      convertedValue: numericValue,
      unclassifiedReason: null,
    };
  }

  // Look up conversion
  const conversion = input.conversions.find(
    (c) =>
      c.canonicalId === input.canonicalId &&
      c.from === input.rawUnit &&
      c.to === input.canonicalUnit,
  );

  if (!conversion) {
    return {
      valueType: "numeric",
      numericValue,
      qualifier,
      canonicalUnit: input.canonicalUnit,
      convertedValue: null,
      unclassifiedReason: "unit_conversion_missing",
    };
  }

  return {
    valueType: "numeric",
    numericValue,
    qualifier,
    canonicalUnit: input.canonicalUnit,
    convertedValue: numericValue * conversion.factor,
    unclassifiedReason: null,
  };
}
