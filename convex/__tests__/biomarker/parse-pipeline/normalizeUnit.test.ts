import { describe, it, expect } from "vitest";

import {
  normalizeUnit,
  type UnitConversion,
} from "../../../biomarker/internal/normalizeUnit";

const conversions: UnitConversion[] = [
  {
    from: "mg/dL",
    to: "mmol/L",
    canonicalId: "cholesterol_total",
    factor: 0.02586,
  },
  { from: "mIU/L", to: "uIU/mL", canonicalId: "tsh", factor: 1 },
  { from: "ng/mL", to: "nmol/L", canonicalId: "vitamin_d", factor: 2.496 },
];

describe("normalizeUnit", () => {
  it("returns { numericValue, canonicalUnit } when units match canonical", () => {
    const result = normalizeUnit({
      rawValue: "4.2",
      rawUnit: "uIU/mL",
      canonicalId: "tsh",
      canonicalUnit: "uIU/mL",
      conversions,
    });
    expect(result.numericValue).toBe(4.2);
    expect(result.canonicalUnit).toBe("uIU/mL");
    expect(result.convertedValue).toBe(4.2);
  });

  it("applies the factor when units differ", () => {
    const result = normalizeUnit({
      rawValue: "200",
      rawUnit: "mg/dL",
      canonicalId: "cholesterol_total",
      canonicalUnit: "mmol/L",
      conversions,
    });
    expect(result.numericValue).toBe(200);
    expect(result.convertedValue).toBeCloseTo(5.172, 3);
  });

  it("returns null convertedValue + reason when no conversion exists", () => {
    const result = normalizeUnit({
      rawValue: "5.0",
      rawUnit: "unknown_unit",
      canonicalId: "cholesterol_total",
      canonicalUnit: "mmol/L",
      conversions,
    });
    expect(result.convertedValue).toBeNull();
    expect(result.unclassifiedReason).toBe("unit_conversion_missing");
  });

  it("returns null convertedValue for qualitative values", () => {
    const result = normalizeUnit({
      rawValue: "Non-reactive",
      rawUnit: null,
      canonicalId: "hiv_antibody",
      canonicalUnit: null,
      conversions,
    });
    expect(result.convertedValue).toBeNull();
    expect(result.numericValue).toBeNull();
    expect(result.valueType).toBe("qualitative");
  });

  it("parses numeric rawValue with whitespace and locale commas", () => {
    const result = normalizeUnit({
      rawValue: " 1,200 ",
      rawUnit: "mg/dL",
      canonicalId: "cholesterol_total",
      canonicalUnit: "mg/dL",
      conversions,
    });
    expect(result.numericValue).toBe(1200);
  });

  it("handles < and > prefixes by taking the threshold", () => {
    const result = normalizeUnit({
      rawValue: "<5",
      rawUnit: "uIU/mL",
      canonicalId: "tsh",
      canonicalUnit: "uIU/mL",
      conversions,
    });
    expect(result.numericValue).toBe(5);
    expect(result.qualifier).toBe("<");
  });
});
