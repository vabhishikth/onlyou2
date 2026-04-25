import { useQuestionnaireStore } from "../questionnaire-store";

beforeEach(() => {
  useQuestionnaireStore.getState().reset();
});

describe("questionnaire store", () => {
  it("startHL initialises state", () => {
    useQuestionnaireStore.getState().startHL("hair-loss-v1", "q1_age");
    const s = useQuestionnaireStore.getState();
    expect(s.schemaVersion).toBe("hair-loss-v1");
    expect(s.currentQid).toBe("q1_age");
    expect(s.history).toEqual([]);
    expect(s.condition).toBe("hair-loss");
  });

  it("advance pushes to history and updates currentQid", () => {
    const store = useQuestionnaireStore.getState();
    store.startHL("hair-loss-v1", "q1_age");
    store.advance("q1_age", "q2_sex");
    const s = useQuestionnaireStore.getState();
    expect(s.history).toEqual(["q1_age"]);
    expect(s.currentQid).toBe("q2_sex");
  });

  it("goBack pops history", () => {
    const store = useQuestionnaireStore.getState();
    store.startHL("hair-loss-v1", "q1_age");
    store.advance("q1_age", "q2_sex");
    store.advance("q2_sex", "q3_location");
    const prev = store.goBack();
    expect(prev).toBe("q2_sex");
    expect(useQuestionnaireStore.getState().currentQid).toBe("q2_sex");
    expect(useQuestionnaireStore.getState().history).toEqual(["q1_age"]);
  });
});
