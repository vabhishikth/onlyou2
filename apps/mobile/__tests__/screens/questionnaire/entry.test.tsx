import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useAuthStore } from "@/stores/auth-store";
import { TestProvider } from "@/test-utils";

const mockParams: { condition: string } = { condition: "hair-loss" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const { router } = require("expo-router");

const Entry = require("../../../app/questionnaire/[condition]/index").default;

describe("Questionnaire entry screen", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
    (router.back as jest.Mock).mockClear();
    // Phase 3B: start handler calls startConsultation which requires a token.
    useAuthStore.setState({ token: "test-token", hydrated: true });
  });

  it("renders intro for hair-loss (male) and starts the first question", async () => {
    mockParams.condition = "hair-loss";
    const { getByText } = render(
      <TestProvider scenario="new">
        <Entry />
      </TestProvider>,
    );
    expect(getByText("Your Hair Loss assessment")).toBeTruthy();
    expect(getByText("Hair & Scalp")).toBeTruthy();
    fireEvent.press(getByText("Start assessment"));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        "/questionnaire/hair-loss/q1_age",
      ),
    );
  });

  it("shows the Plan 4+ not-available state for female hair-loss", () => {
    mockParams.condition = "hair-loss";
    const { getByText, queryByText } = render(
      <TestProvider scenario="reviewing">
        {/* Priya fixture is female */}
        <Entry />
      </TestProvider>,
    );
    expect(getByText("Women's hair care is on the way")).toBeTruthy();
    expect(queryByText("Start assessment")).toBeNull();
    fireEvent.press(getByText("Back to explore"));
    expect(router.back).toHaveBeenCalled();
  });

  it("renders ED intro copy for male patients", () => {
    mockParams.condition = "ed";
    const { getByText } = render(
      <TestProvider scenario="new">
        <Entry />
      </TestProvider>,
    );
    expect(getByText("Your ED assessment")).toBeTruthy();
    expect(getByText("Sexual Health")).toBeTruthy();
  });
});
