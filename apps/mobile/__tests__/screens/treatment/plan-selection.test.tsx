import { fireEvent, render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const { router } = require("expo-router");

const PlanSelection = require("../../../app/treatment/plan-selection").default;

describe("Treatment plan-selection screen", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
  });

  it("renders monthly/quarterly/6-month plans with pricing and routes to payment", () => {
    const { getByText } = render(
      <TestProvider scenario="ready">
        <PlanSelection />
      </TestProvider>,
    );
    expect(getByText("Choose your plan")).toBeTruthy();
    expect(getByText("6-month")).toBeTruthy();
    expect(getByText("Quarterly")).toBeTruthy();
    expect(getByText("Monthly")).toBeTruthy();
    expect(getByText("Best value")).toBeTruthy();
    expect(getByText("Popular")).toBeTruthy();

    // hair-loss pricing: monthly ₹999, quarterly ₹833/mo (₹2,499 total),
    // 6-month ₹750/mo (₹4,499 total)
    expect(getByText("₹999")).toBeTruthy();
    expect(getByText("₹833")).toBeTruthy();
    expect(getByText("₹750")).toBeTruthy();

    fireEvent.press(getByText("Monthly"));
    fireEvent.press(getByText("Continue to payment"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/treatment/payment",
      params: { plan: "monthly", vertical: "hair-loss" },
    });
  });
});
