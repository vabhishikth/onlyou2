import { useQuestionnaireStore } from "@/stores/questionnaire-store";

describe("questionnaire-store", () => {
  beforeEach(() => {
    useQuestionnaireStore.getState().reset();
  });

  it("start sets the active condition and clears prior answers", () => {
    useQuestionnaireStore.getState().setAnswer("x", "y");
    useQuestionnaireStore.getState().start("hair-loss");
    const state = useQuestionnaireStore.getState();
    expect(state.condition).toBe("hair-loss");
    expect(state.answers).toEqual({});
  });

  it("setAnswer and getAnswer persist a single value", () => {
    useQuestionnaireStore.getState().start("hair-loss");
    useQuestionnaireStore.getState().setAnswer("gender", "male");
    expect(useQuestionnaireStore.getState().getAnswer("gender")).toBe("male");
  });

  it("setAnswer supports multi answers as arrays", () => {
    useQuestionnaireStore.getState().start("hair-loss");
    useQuestionnaireStore.getState().setAnswer("areas", ["temples", "crown"]);
    expect(useQuestionnaireStore.getState().getAnswer("areas")).toEqual([
      "temples",
      "crown",
    ]);
  });

  it("reset clears condition and answers", () => {
    useQuestionnaireStore.getState().start("ed");
    useQuestionnaireStore.getState().setAnswer("q1", "a");
    useQuestionnaireStore.getState().reset();
    const state = useQuestionnaireStore.getState();
    expect(state.condition).toBeNull();
    expect(state.answers).toEqual({});
  });
});
