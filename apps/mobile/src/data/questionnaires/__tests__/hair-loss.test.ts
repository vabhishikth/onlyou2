import { HAIR_LOSS_SCHEMA_VERSION, hairLossQuestions } from "../hair-loss";

describe("hair-loss questionnaire shape", () => {
  it("has exactly 28 questions", () => {
    expect(hairLossQuestions).toHaveLength(28);
  });

  it("schema version matches v1", () => {
    expect(HAIR_LOSS_SCHEMA_VERSION).toBe("hair-loss-v1");
  });

  it("all question ids are unique and start with 'q' + digits + '_'", () => {
    const ids = hairLossQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^q\d+_[a-z_]+$/);
    }
  });

  it("Q1 is a number input with 18..80 bounds", () => {
    const q1 = hairLossQuestions[0];
    expect(q1.type).toBe("number");
    expect(q1.min).toBe(18);
    expect(q1.max).toBe(80);
  });

  it("Q2 sex is single-select with male/female options", () => {
    const q2 = hairLossQuestions[1];
    expect(q2.type).toBe("single");
    expect(q2.options?.map((o) => o.value).sort()).toEqual(["female", "male"]);
  });

  it("Q3 has maleOptions + femaleOptions, not a single options list", () => {
    const q3 = hairLossQuestions[2];
    expect(q3.maleOptions).toBeDefined();
    expect(q3.femaleOptions).toBeDefined();
    expect(q3.options).toBeUndefined();
  });

  it("Q22–Q25 are sexGate male", () => {
    const gated = hairLossQuestions.filter((q) => q.sexGate === "male");
    expect(gated.map((q) => q.id).sort()).toEqual([
      "q22_sexual_function",
      "q23_concern",
      "q24_topical_preference",
      "q25_conception_plan",
    ]);
  });

  it("Q6 skips when Q5 answer includes no_family_history or not_sure", () => {
    const q6 = hairLossQuestions.find((q) => q.id === "q6_family_onset_age");
    expect(q6?.skipIf).toEqual([
      {
        qid: "q5_family",
        values: ["no_family_history", "not_sure"],
        mode: "includes",
      },
    ]);
  });

  it("Q24 skips when Q23 === not_concerned", () => {
    const q24 = hairLossQuestions.find(
      (q) => q.id === "q24_topical_preference",
    );
    expect(q24?.skipIf).toEqual([
      { qid: "q23_concern", values: ["not_concerned"], mode: "equals" },
    ]);
  });

  it("Q27 skips when Q26 includes none_first_treatment", () => {
    const q27 = hairLossQuestions.find((q) => q.id === "q27_treatment_results");
    expect(q27?.skipIf).toEqual([
      {
        qid: "q26_prior_treatments",
        values: ["none_first_treatment"],
        mode: "includes",
      },
    ]);
  });
});
