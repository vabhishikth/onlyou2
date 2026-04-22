import { describe, it, expect } from "vitest";

import {
  fuzzyAliasMatch,
  type RangeForMatch,
} from "../../biomarker/lib/fuzzyAliasMatch";

const ranges: RangeForMatch[] = [
  {
    canonicalId: "hba1c",
    canonicalUnit: "%",
    aliases: ["HbA1c", "Glycated Hemoglobin", "Hemoglobin A1c"],
  },
  {
    canonicalId: "tsh",
    canonicalUnit: "mIU/L",
    aliases: ["TSH", "Thyroid Stimulating Hormone"],
  },
];

describe("fuzzyAliasMatch", () => {
  it("returns null when no canonical scores >= 0.92", () => {
    const result = fuzzyAliasMatch({
      normalizedName: "random_marker",
      rawUnit: "mg/dL",
      canonicalIdGuess: null,
      ranges,
    });
    expect(result).toBeNull();
  });

  it("returns canonical when fuzzy score + unit match + guess agrees", () => {
    const result = fuzzyAliasMatch({
      normalizedName: "Hemoglobin_A1c",
      rawUnit: "%",
      canonicalIdGuess: "hba1c",
      ranges,
    });
    expect(result).toBe("hba1c");
  });

  it("returns null when Claude's guess disagrees (disagreement blocks)", () => {
    const result = fuzzyAliasMatch({
      normalizedName: "Hemoglobin_A1c",
      rawUnit: "%",
      canonicalIdGuess: "tsh",
      ranges,
    });
    expect(result).toBeNull();
  });

  it("accepts null Claude guess (doesn't block when no opinion)", () => {
    const result = fuzzyAliasMatch({
      normalizedName: "Hemoglobin_A1c",
      rawUnit: "%",
      canonicalIdGuess: null,
      ranges,
    });
    expect(result).toBe("hba1c");
  });

  it("blocks on unit mismatch even with strong name match", () => {
    const result = fuzzyAliasMatch({
      normalizedName: "HbA1c",
      rawUnit: "mg/dL",
      canonicalIdGuess: "hba1c",
      ranges,
    });
    expect(result).toBeNull();
  });

  it("blocks on ambiguous match (two canonicals tie at threshold)", () => {
    const ambRanges: RangeForMatch[] = [
      {
        canonicalId: "total_cholesterol",
        canonicalUnit: "mg/dL",
        aliases: ["Cholesterol Total"],
      },
      {
        canonicalId: "hdl_cholesterol",
        canonicalUnit: "mg/dL",
        aliases: ["Cholesterol HDL"],
      },
    ];
    const result = fuzzyAliasMatch({
      normalizedName: "cholesterol",
      rawUnit: "mg/dL",
      canonicalIdGuess: null,
      ranges: ambRanges,
    });
    expect(result).toBeNull();
  });
});
