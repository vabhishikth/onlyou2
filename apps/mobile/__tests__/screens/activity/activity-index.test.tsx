import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const ActivityIndex = require("../../../app/(tabs)/activity/index").default;

describe("Activity tab — index", () => {
  it("groups sanjana's orders into active and completed sections", () => {
    const { getByText, queryByText } = render(
      <TestProvider scenario="active">
        <ActivityIndex />
      </TestProvider>,
    );
    expect(getByText("Activity")).toBeTruthy();
    expect(getByText("Active")).toBeTruthy();
    expect(getByText("Completed")).toBeTruthy();
    // sanjana has one out-for-delivery order in the active bucket
    expect(getByText("Out for delivery")).toBeTruthy();
    expect(getByText(/pcos · 2 items/)).toBeTruthy();
    // no completed orders yet for sanjana
    expect(queryByText("No completed orders yet.")).toBeTruthy();
  });

  it("shows empty states for a brand-new user with no orders", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <ActivityIndex />
      </TestProvider>,
    );
    expect(getByText("No active orders.")).toBeTruthy();
    expect(getByText("No completed orders yet.")).toBeTruthy();
  });
});
