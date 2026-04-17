import { fireEvent, render } from "@testing-library/react-native";

import { useDevScenarioStore } from "@/stores/dev-scenario-store";
import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const { router } = require("expo-router");

const SubscriptionConfirmed =
  require("../../../app/treatment/subscription-confirmed").default;

describe("Treatment subscription-confirmed screen", () => {
  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
  });

  it("renders success copy and flips scenario to active + routes home", () => {
    const { getByText } = render(
      <TestProvider scenario="ready">
        <SubscriptionConfirmed />
      </TestProvider>,
    );
    expect(getByText("You're all set")).toBeTruthy();
    expect(getByText(/preparing your first medication kit/)).toBeTruthy();

    fireEvent.press(getByText("Go to home"));

    expect(useDevScenarioStore.getState().activeScenario).toBe("active");
    expect(useDevScenarioStore.getState().lastSource).toBe("flow");
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/home");
  });
});
