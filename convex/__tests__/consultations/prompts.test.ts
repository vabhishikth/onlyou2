import { describe, expect, it } from "vitest";

import { FLAG_CODES } from "../../consultations/aiAssessmentSchema";
import {
  buildHairLossUserPrompt,
  HAIR_LOSS_SYSTEM_PROMPT,
} from "../../consultations/prompts/hairLoss";

describe("HAIR_LOSS_SYSTEM_PROMPT", () => {
  it("enumerates every flag code from FLAG_CODES verbatim", () => {
    for (const code of FLAG_CODES) {
      expect(HAIR_LOSS_SYSTEM_PROMPT).toContain(code);
    }
  });

  it("forbids addressing the patient directly", () => {
    expect(HAIR_LOSS_SYSTEM_PROMPT.toLowerCase()).toMatch(
      /never address the patient/,
    );
  });

  it("requires JSON-only output (no prose, no code-fence)", () => {
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/JSON/);
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/no code fence|no code-fence/i);
  });

  it("documents Norwood + Ludwig + unclassified scales", () => {
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/Norwood/);
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/Ludwig/);
    expect(HAIR_LOSS_SYSTEM_PROMPT).toMatch(/unclassified/);
  });
});

describe("buildHairLossUserPrompt", () => {
  const baseAnswers = {
    q1_age: 32,
    q2_sex: "male",
    q3_pattern_male: ["crown", "hairline"],
    q4_age_of_onset: 28,
  };
  const baseDemo = { age: 32, sex: "male" as const };

  it("includes a demographics header", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).toMatch(/age:\s*32/i);
    expect(out).toMatch(/sex:\s*male/i);
  });

  it("renders each answered question on its own line", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).toContain("q1_age");
    expect(out).toContain("q3_pattern_male");
  });

  it("formats array answers comma-separated", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).toMatch(/q3_pattern_male:\s*crown,\s*hairline/);
  });

  it("does not leak fields beyond what was passed", () => {
    const out = buildHairLossUserPrompt(baseAnswers, baseDemo);
    expect(out).not.toMatch(/password|phoneNumber|email/i);
  });
});
