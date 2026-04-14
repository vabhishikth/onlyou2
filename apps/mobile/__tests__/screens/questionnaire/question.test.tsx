import { fireEvent, render } from "@testing-library/react-native";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const mockParams: { condition: string; qid: string } = {
  condition: "hair-loss",
  qid: "gender",
};

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
}));

const { router } = require("expo-router");

const QuestionScreen =
  require("../../../app/questionnaire/[condition]/[qid]").default;

describe("Question screen", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
    useQuestionnaireStore.getState().reset();
  });

  it("renders a single-choice question and gates Next until an option is picked", () => {
    mockParams.condition = "hair-loss";
    mockParams.qid = "gender";
    const { getByText } = render(
      <TestProvider scenario="new">
        <QuestionScreen />
      </TestProvider>,
    );
    expect(getByText("How do you identify?")).toBeTruthy();
    // Next should be disabled initially -> pressing does nothing.
    fireEvent.press(getByText("Next"));
    expect(router.push).not.toHaveBeenCalled();

    // Pick an option and advance.
    fireEvent.press(getByText("Male"));
    fireEvent.press(getByText("Next"));
    expect(router.push).toHaveBeenCalledWith(
      "/questionnaire/hair-loss/duration",
    );
    expect(useQuestionnaireStore.getState().answers.gender).toBe("male");
  });

  it("routes to review when the last question is answered", () => {
    mockParams.condition = "hair-loss";
    mockParams.qid = "photos"; // last question in the bank
    const { getByText } = render(
      <TestProvider scenario="new">
        <QuestionScreen />
      </TestProvider>,
    );
    // Photo is handled elsewhere but canProceed is true immediately.
    fireEvent.press(getByText("Next"));
    expect(router.push).toHaveBeenCalledWith("/questionnaire/hair-loss/review");
  });
});
