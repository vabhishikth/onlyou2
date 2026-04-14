import {
  edQuestions,
  getQuestionBank,
  hairLossQuestions,
  QUESTION_BANKS,
  type Question,
  type QuestionType,
} from "@/data/questionnaires";

const VALID_TYPES: QuestionType[] = ["single", "multi", "text", "photo"];

function assertValidQuestion(q: Question) {
  expect(typeof q.id).toBe("string");
  expect(q.id.length).toBeGreaterThan(0);
  expect(VALID_TYPES).toContain(q.type);
  expect(typeof q.title).toBe("string");
  expect(q.title.length).toBeGreaterThan(0);
  expect(typeof q.required).toBe("boolean");

  if (q.type === "single" || q.type === "multi") {
    expect(Array.isArray(q.options)).toBe(true);
    expect(q.options!.length).toBeGreaterThan(0);
    for (const opt of q.options!) {
      expect(typeof opt.value).toBe("string");
      expect(opt.value.length).toBeGreaterThan(0);
      expect(typeof opt.label).toBe("string");
      expect(opt.label.length).toBeGreaterThan(0);
    }
  }
}

describe("questionnaires data", () => {
  it("exposes the hair-loss question bank", () => {
    expect(Array.isArray(hairLossQuestions)).toBe(true);
    expect(hairLossQuestions.length).toBeGreaterThan(0);
    for (const q of hairLossQuestions) {
      assertValidQuestion(q);
    }
  });

  it("exposes the ed question bank", () => {
    expect(Array.isArray(edQuestions)).toBe(true);
    expect(edQuestions.length).toBeGreaterThan(0);
    for (const q of edQuestions) {
      assertValidQuestion(q);
    }
  });

  it("has unique ids within each bank", () => {
    const hairIds = hairLossQuestions.map((q) => q.id);
    expect(new Set(hairIds).size).toBe(hairIds.length);

    const edIds = edQuestions.map((q) => q.id);
    expect(new Set(edIds).size).toBe(edIds.length);
  });

  it("registers both banks in QUESTION_BANKS", () => {
    expect(QUESTION_BANKS["hair-loss"]).toBe(hairLossQuestions);
    expect(QUESTION_BANKS.ed).toBe(edQuestions);
  });

  describe("getQuestionBank()", () => {
    it("returns the hair-loss bank for hair-loss", () => {
      expect(getQuestionBank("hair-loss")).toBe(hairLossQuestions);
    });

    it("returns the ed bank for ed", () => {
      expect(getQuestionBank("ed")).toBe(edQuestions);
    });

    it("returns undefined for verticals without a stub bank yet", () => {
      expect(getQuestionBank("pe")).toBeUndefined();
      expect(getQuestionBank("weight")).toBeUndefined();
      expect(getQuestionBank("pcos")).toBeUndefined();
    });
  });
});
