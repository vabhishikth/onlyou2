import { describe, it, expect } from "vitest";

import {
  classifyRow,
  type ClassifyInput,
  type ReferenceRange,
  type UserProfile,
} from "../../../biomarker/internal/classifyRow";

const tshRange: ReferenceRange = {
  canonicalId: "tsh",
  displayName: "TSH",
  category: "Endocrine",
  canonicalUnit: "uIU/mL",
  ageMin: 18,
  ageMax: 120,
  sex: "any",
  pregnancySensitive: true,
  optimalMin: 0.4,
  optimalMax: 4.0,
  subOptimalBelowMin: 0.2,
  subOptimalAboveMax: 5.0,
  actionBelow: 0.2,
  actionAbove: 5.0,
};

const testosteroneRange: ReferenceRange = {
  canonicalId: "testosterone_total",
  displayName: "Total Testosterone",
  category: "Hormones",
  canonicalUnit: "ng/dL",
  ageMin: 18,
  ageMax: 120,
  sex: "male",
  pregnancySensitive: false,
  optimalMin: 300,
  optimalMax: 900,
  subOptimalBelowMin: 250,
  subOptimalAboveMax: 1000,
  actionBelow: 250,
  actionAbove: 1000,
};

const adultMalePatient: UserProfile = {
  dob: "1990-01-01",
  sex: "male",
  pregnancyStatus: "not_pregnant",
};
const adultFemalePatient: UserProfile = {
  dob: "1990-01-01",
  sex: "female",
  pregnancyStatus: "not_pregnant",
};
const pregnancyUnknownPatient: UserProfile = {
  dob: "1990-01-01",
  sex: "female",
  pregnancyStatus: "unknown",
};
const profileIncomplete: UserProfile = {
  dob: undefined,
  sex: "male",
  pregnancyStatus: "not_pregnant",
};

function baseInput(
  value: number,
  ranges: ReferenceRange[],
  user: UserProfile,
): ClassifyInput {
  return {
    marker: {
      name_on_report: "TSH",
      canonical_id_guess: "tsh",
      raw_value: String(value),
      raw_unit: "uIU/mL",
      lab_printed_range: "0.4-4.0",
      page_number: 1,
      confidence: 0.95,
    },
    user,
    ranges,
    conversions: [],
  };
}

describe("classifyRow", () => {
  describe("happy path", () => {
    it("returns optimal when value is inside optimalMin..optimalMax", () => {
      const result = classifyRow(baseInput(2.1, [tshRange], adultMalePatient));
      expect(result.status).toBe("optimal");
      expect(result.canonicalId).toBe("tsh");
    });

    it("returns sub_optimal when value is between sub-optimal and optimal bounds", () => {
      const result = classifyRow(baseInput(4.5, [tshRange], adultMalePatient));
      expect(result.status).toBe("sub_optimal");
    });

    it("returns action_required when value is outside action bounds", () => {
      const result = classifyRow(baseInput(0.1, [tshRange], adultMalePatient));
      expect(result.status).toBe("action_required");
    });

    it("treats tied action == sub_optimal boundary as action_required (stricter wins)", () => {
      // actionBelow == subOptimalBelowMin == 0.2
      const result = classifyRow(baseInput(0.2, [tshRange], adultMalePatient));
      expect(result.status).toBe("action_required");
    });
  });

  describe("pregnancy guard (runs first)", () => {
    it("returns unclassified with pregnancy_sensitive when status unknown on a sensitive marker", () => {
      const result = classifyRow(
        baseInput(2.1, [tshRange], pregnancyUnknownPatient),
      );
      expect(result.status).toBe("unclassified");
      expect(result.unclassifiedReason).toBe("pregnancy_sensitive");
    });

    it("classifies normally when patient is known not-pregnant on a sensitive marker", () => {
      const result = classifyRow(
        baseInput(2.1, [tshRange], adultFemalePatient),
      );
      expect(result.status).toBe("optimal");
    });

    it("skips pregnancy guard on non-sensitive markers", () => {
      const input: ClassifyInput = {
        marker: {
          name_on_report: "Total Testosterone",
          canonical_id_guess: "testosterone_total",
          raw_value: "500",
          raw_unit: "ng/dL",
          lab_printed_range: null,
          page_number: 1,
          confidence: 0.95,
        },
        user: { ...pregnancyUnknownPatient, sex: "male" },
        ranges: [testosteroneRange],
        conversions: [],
      };
      const result = classifyRow(input);
      expect(result.status).toBe("optimal");
    });
  });

  describe("profile guard", () => {
    it("returns unclassified with profile_incomplete when DOB missing", () => {
      const result = classifyRow(baseInput(2.1, [tshRange], profileIncomplete));
      expect(result.status).toBe("unclassified");
      expect(result.unclassifiedReason).toBe("profile_incomplete");
    });
  });

  describe("reference range lookup", () => {
    it("returns unclassified with not_in_reference_db when no range matches canonicalId", () => {
      const input = baseInput(1.0, [], adultMalePatient);
      input.marker.canonical_id_guess = "totally_unknown_marker";
      const result = classifyRow(input);
      expect(result.status).toBe("unclassified");
      expect(result.unclassifiedReason).toBe("not_in_reference_db");
    });

    it("picks the correct sex-specific range when available", () => {
      const input: ClassifyInput = {
        marker: {
          name_on_report: "Total Testosterone",
          canonical_id_guess: "testosterone_total",
          raw_value: "500",
          raw_unit: "ng/dL",
          lab_printed_range: null,
          page_number: 1,
          confidence: 0.95,
        },
        user: adultMalePatient,
        ranges: [testosteroneRange],
        conversions: [],
      };
      expect(classifyRow(input).status).toBe("optimal");
    });

    it("returns unclassified when sex-specific range exists but user sex doesn't match", () => {
      const input: ClassifyInput = {
        marker: {
          name_on_report: "Total Testosterone",
          canonical_id_guess: "testosterone_total",
          raw_value: "500",
          raw_unit: "ng/dL",
          lab_printed_range: null,
          page_number: 1,
          confidence: 0.95,
        },
        user: adultFemalePatient, // female against a male-only range
        ranges: [testosteroneRange],
        conversions: [],
      };
      const result = classifyRow(input);
      expect(result.status).toBe("unclassified");
    });
  });

  describe("qualitative values", () => {
    it("returns unclassified with qualitative_value when raw_value is non-numeric", () => {
      const input: ClassifyInput = {
        marker: {
          name_on_report: "HIV Antibody",
          canonical_id_guess: "hiv_antibody",
          raw_value: "Non-reactive",
          raw_unit: null,
          lab_printed_range: null,
          page_number: 1,
          confidence: 0.95,
        },
        user: adultMalePatient,
        ranges: [],
        conversions: [],
      };
      const result = classifyRow(input);
      expect(result.status).toBe("unclassified");
      expect(result.unclassifiedReason).toBe("qualitative_value");
      expect(result.valueType).toBe("qualitative");
    });
  });
});
