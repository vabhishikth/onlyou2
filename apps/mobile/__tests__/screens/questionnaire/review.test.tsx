import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Id } from "../../../../../convex/_generated/dataModel";

import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const TEST_CONSULT_ID = "test-consultation-id" as Id<"consultations">;

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
    mockParams.condition = "hair-loss";
    // Phase 3B: real Submit hook needs both an auth token and a server-issued
    // consultationId on the store before it will fire the mutation.
    useAuthStore.setState({ token: "test-token", hydrated: true });
  });

  it("renders section headings for HL", () => {
    const s = useQuestionnaireStore.getState();
    s.start("hair-loss");
    s.setAnswer("q1_age", "32");
    s.setAnswer("q2_sex", "male");
    s.setAnswer("q10_duration", "6_12m");
    s.setAnswer("q13_scalp_symptoms", ["itching", "flaking"]);

    const { getByText } = render(
      <TestProvider scenario="new">
        <Review />
      </TestProvider>,
    );
    expect(getByText("Basics")).toBeTruthy();
    expect(getByText("Current symptoms")).toBeTruthy();
  });

  it("Q3 male option label resolved", () => {
    const s = useQuestionnaireStore.getState();
    s.start("hair-loss");
    s.setAnswer("q2_sex", "male");
    s.setAnswer("q3_location", "receding_hairline");

    const { getByText } = render(
      <TestProvider scenario="new">
        <Review />
      </TestProvider>,
    );
    expect(getByText("Receding hairline")).toBeTruthy();
  });

  it("tapping a row navigates back to that question", () => {
    const s = useQuestionnaireStore.getState();
    s.start("hair-loss");
    s.setAnswer("q2_sex", "male");

    const { getByLabelText } = render(
      <TestProvider scenario="new">
        <Review />
      </TestProvider>,
    );
    fireEvent.press(getByLabelText("Edit What is your biological sex?"));
    expect(router.push).toHaveBeenCalledWith("/questionnaire/hair-loss/q2_sex");
  });

  it("Submit gated by consent", async () => {
    const s = useQuestionnaireStore.getState();
    s.startHL("hair-loss-v1", "q1_age");
    s.setAnswer("q2_sex", "male");
    s.setConsultationId(TEST_CONSULT_ID);

    const { getByText, getByLabelText } = render(
      <TestProvider scenario="new">
        <Review />
      </TestProvider>,
    );

    // Submit pressed without consent — no navigation.
    fireEvent.press(getByText("Submit assessment"));
    expect(router.dismissAll).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalledWith("/treatment/confirmation");

    // Tick consent, then submit.
    fireEvent.press(getByLabelText("I confirm the answers are accurate"));
    fireEvent.press(getByText("Submit assessment"));
    await waitFor(() => expect(router.dismissAll).toHaveBeenCalled());
    expect(router.push).toHaveBeenCalledWith("/treatment/confirmation");
  });
});
