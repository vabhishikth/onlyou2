import { fireEvent, render } from "@testing-library/react-native";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const mockParams: { condition: string } = { condition: "hair-loss" };

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

const Review = require("../../../app/questionnaire/[condition]/review").default;

describe("Questionnaire review screen", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
    (router.dismissAll as jest.Mock).mockClear();
    useQuestionnaireStore.getState().reset();
  });

  it("lists all questions from the bank with stored answers", () => {
    useQuestionnaireStore.getState().start("hair-loss");
    useQuestionnaireStore.getState().setAnswer("q2_sex", "male");
    useQuestionnaireStore.getState().setAnswer("q10_duration", "6_12m");
    useQuestionnaireStore
      .getState()
      .setAnswer("q13_scalp_symptoms", ["itching", "flaking"]);

    mockParams.condition = "hair-loss";
    const { getByText } = render(
      <TestProvider scenario="new">
        <Review />
      </TestProvider>,
    );
    expect(getByText("Review your answers")).toBeTruthy();
    expect(getByText("What is your biological sex?")).toBeTruthy();
    expect(getByText("Male")).toBeTruthy();
    expect(getByText("6–12 months")).toBeTruthy();
    expect(getByText("Itching, Flaking or dandruff")).toBeTruthy();
  });

  it("Submit dismisses the modal stack and pushes to /treatment/confirmation", () => {
    useQuestionnaireStore.getState().start("hair-loss");
    mockParams.condition = "hair-loss";
    const { getByText } = render(
      <TestProvider scenario="new">
        <Review />
      </TestProvider>,
    );
    fireEvent.press(getByText("Submit assessment"));
    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/treatment/confirmation");
    // Reset should have cleared the store.
    expect(useQuestionnaireStore.getState().condition).toBeNull();
  });
});
