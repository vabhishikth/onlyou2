import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runAttempt } from "../../consultations/aiAssessment";

const FIXTURE_DIR = join(__dirname, "..", "fixtures", "aiAssessment");
const RUN_LIVE = !!process.env.ANTHROPIC_API_KEY;
const maybe = RUN_LIVE ? describe : describe.skip;

type Fixture = {
  demographics: { age: number; sex: "male" | "female" };
  answers: Record<string, unknown>;
  expectations: {
    stage_scale?: string;
    stage_scale_in?: string[];
    stage_value_pattern?: string;
    must_contain_flag_code?: string;
    must_not_contain_red_flag?: boolean;
    min_overall_confidence?: number;
  };
};

function loadFixture(name: string): Fixture {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf8"));
}

maybe("aiAssessment live-API smoke", () => {
  it("male-aga: classic Norwood pattern, no red flags", async () => {
    const f = loadFixture("male-aga");
    const out = await runAttempt({
      answers: f.answers,
      demographics: f.demographics,
    });
    if (!out.ok) {
      throw new Error(
        `unexpected failure: ${out.failureClass} — ${out.errorMessage}`,
      );
    }

    expect(out.response.stage.scale).toBe(f.expectations.stage_scale);
    if (f.expectations.stage_value_pattern) {
      expect(out.response.stage.value).toMatch(
        new RegExp(f.expectations.stage_value_pattern),
      );
    }
    if (f.expectations.must_not_contain_red_flag) {
      expect(
        out.response.flags.some((flag) => flag.severity === "red_flag"),
      ).toBe(false);
    }
    if (f.expectations.min_overall_confidence !== undefined) {
      expect(out.response.confidence).toBeGreaterThanOrEqual(
        f.expectations.min_overall_confidence,
      );
    }
  }, 90_000);

  it("female-aga: Ludwig + finasteride contraindication red flag", async () => {
    const f = loadFixture("female-aga");
    const out = await runAttempt({
      answers: f.answers,
      demographics: f.demographics,
    });
    if (!out.ok) {
      throw new Error(
        `unexpected failure: ${out.failureClass} — ${out.errorMessage}`,
      );
    }

    expect(out.response.stage.scale).toBe("ludwig");
    expect(out.response.flags.map((flag) => flag.code)).toContain(
      "FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING",
    );
    expect(out.response.confidence).toBeGreaterThanOrEqual(
      f.expectations.min_overall_confidence!,
    );
  }, 90_000);

  it("scarring: SCARRING_ALOPECIA_SUSPECT red flag, scale unclassified or norwood", async () => {
    const f = loadFixture("scarring");
    const out = await runAttempt({
      answers: f.answers,
      demographics: f.demographics,
    });
    if (!out.ok) {
      throw new Error(
        `unexpected failure: ${out.failureClass} — ${out.errorMessage}`,
      );
    }

    expect(out.response.flags.map((flag) => flag.code)).toContain(
      "SCARRING_ALOPECIA_SUSPECT",
    );
    expect(["unclassified", "norwood"]).toContain(out.response.stage.scale);
  }, 90_000);
});
