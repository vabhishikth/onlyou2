import { describe, expect, it } from "vitest";

import {
  aiAssessmentResponseSchema,
  FLAG_CODES,
  PROMPT_VERSION_HAIR_LOSS,
  STAGE_SCALES,
} from "../../consultations/aiAssessmentSchema";

const validResponse = {
  narrative:
    "32-year-old male with classic Norwood III pattern hair loss; family history strong on maternal side.",
  stage: { scale: "norwood", value: "III", confidence: 0.85 },
  flags: [
    {
      code: "FINASTERIDE_CAUTION_UNDER_25",
      severity: "caution",
      message: "Patient under 25; counsel re: finasteride.",
    },
  ],
  confidence: 0.82,
};

describe("aiAssessmentResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = aiAssessmentResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("rejects an unknown flag code", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      flags: [
        {
          code: "NOT_A_REAL_CODE",
          severity: "info",
          message: "x",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid stage scale", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      stage: { scale: "bogus", value: "I", confidence: 0.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative stage.confidence", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      stage: { ...validResponse.stage, confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects narrative shorter than 20 chars", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      narrative: "too short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty flags array", () => {
    const result = aiAssessmentResponseSchema.safeParse({
      ...validResponse,
      flags: [],
    });
    expect(result.success).toBe(true);
  });

  it("FLAG_CODES contains exactly 12 entries", () => {
    expect(FLAG_CODES.length).toBe(12);
  });

  it("STAGE_SCALES is the 3-value enum", () => {
    expect(STAGE_SCALES).toEqual(["norwood", "ludwig", "unclassified"]);
  });

  it("PROMPT_VERSION_HAIR_LOSS is hair-loss-v1", () => {
    expect(PROMPT_VERSION_HAIR_LOSS).toBe("hair-loss-v1");
  });
});
