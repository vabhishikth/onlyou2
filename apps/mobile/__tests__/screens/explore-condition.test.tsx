import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

const mockParams: { condition: string } = { condition: "hair-loss" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const ConditionDetail = require("../../app/(tabs)/explore/[condition]").default;

describe("Condition detail screen", () => {
  it("renders full detail for hair-loss (real vertical)", () => {
    mockParams.condition = "hair-loss";
    const { queryByText } = render(
      <TestProvider scenario="new">
        <ConditionDetail />
      </TestProvider>,
    );
    expect(queryByText("Hair Loss")).toBeTruthy();
    expect(queryByText("Hair & Scalp")).toBeTruthy();
    expect(queryByText("How it works")).toBeTruthy();
    expect(queryByText("Pricing")).toBeTruthy();
    expect(queryByText("Start your free review")).toBeTruthy();
  });

  it("renders full detail for ED (real vertical)", () => {
    mockParams.condition = "ed";
    const { queryByText } = render(
      <TestProvider scenario="new">
        <ConditionDetail />
      </TestProvider>,
    );
    expect(queryByText("ED")).toBeTruthy();
    expect(queryByText("Sexual Health")).toBeTruthy();
    expect(queryByText("Start your free review")).toBeTruthy();
  });

  it("renders Coming Soon teaser for PE", () => {
    mockParams.condition = "pe";
    const { queryByText } = render(
      <TestProvider scenario="new">
        <ConditionDetail />
      </TestProvider>,
    );
    expect(queryByText("PE")).toBeTruthy();
    expect(queryByText("Coming soon")).toBeTruthy();
    // No CTA on teaser
    expect(queryByText("Start your free review")).toBeNull();
    expect(queryByText("How it works")).toBeNull();
  });

  it("renders Unknown condition fallback for an invalid slug", () => {
    mockParams.condition = "not-a-real-vertical";
    const { queryByText } = render(
      <TestProvider scenario="new">
        <ConditionDetail />
      </TestProvider>,
    );
    expect(queryByText("Unknown condition.")).toBeTruthy();
  });
});
