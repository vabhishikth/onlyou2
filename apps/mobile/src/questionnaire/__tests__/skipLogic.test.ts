import { hairLossQuestions } from "../../data/questionnaires/hair-loss";
import { getNextQid, getReachableQids } from "../skipLogic";

const baseAnswers = {
  q1_age: "30",
  q2_sex: "male",
};

describe("skipLogic — hair loss", () => {
  it("male patient with family history reaches ~25 questions", () => {
    const answers = {
      ...baseAnswers,
      q5_family: ["father", "paternal_grandfather"],
      q23_concern: "somewhat_concerned",
      q26_prior_treatments: ["minoxidil"],
    };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached.length).toBeGreaterThanOrEqual(23);
    expect(reached.length).toBeLessThanOrEqual(28);
    expect(reached).toContain("q6_family_onset_age");
    expect(reached).toContain("q24_topical_preference");
    expect(reached).toContain("q27_treatment_results");
  });

  it("female patient skips Q22–Q25 entire sexual health section", () => {
    const answers = { ...baseAnswers, q2_sex: "female" };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q22_sexual_function");
    expect(reached).not.toContain("q23_concern");
    expect(reached).not.toContain("q24_topical_preference");
    expect(reached).not.toContain("q25_conception_plan");
  });

  it("male with no family history skips Q6", () => {
    const answers = { ...baseAnswers, q5_family: ["no_family_history"] };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q6_family_onset_age");
  });

  it("'not_concerned' about sexual side effects skips Q24", () => {
    const answers = { ...baseAnswers, q23_concern: "not_concerned" };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q24_topical_preference");
  });

  it("first-timer (Q26 = only none_first_treatment) skips Q27", () => {
    const answers = {
      ...baseAnswers,
      q26_prior_treatments: ["none_first_treatment"],
    };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q27_treatment_results");
  });

  it("getNextQid returns the next reachable qid after the current one", () => {
    const answers = { ...baseAnswers, q5_family: ["no_family_history"] };
    // Q5's next should be the question AFTER Q6 (which is skipped).
    // Look up the actual id for Q7 from the question bank — do not hardcode.
    const q7Id = hairLossQuestions.find((q) => q.id.startsWith("q7_"))!.id;
    expect(getNextQid(hairLossQuestions, answers, "q5_family")).toBe(q7Id);
  });

  it("getNextQid returns null when at the last reachable question", () => {
    const answers = { ...baseAnswers, q5_family: ["no_family_history"] };
    const reached = getReachableQids(hairLossQuestions, answers);
    const last = reached[reached.length - 1];
    expect(getNextQid(hairLossQuestions, answers, last)).toBeNull();
  });
});
