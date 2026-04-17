import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const ExploreIndex = require("../../app/(tabs)/explore/index").default;

describe("Explore tab — gender filter", () => {
  it("male user sees Hair Loss, ED, PE, Weight (no PCOS)", () => {
    const { queryByText } = render(
      <TestProvider scenario="new">
        <ExploreIndex />
      </TestProvider>,
    );
    expect(queryByText("Hair Loss")).toBeTruthy();
    expect(queryByText("ED")).toBeTruthy();
    expect(queryByText("PE")).toBeTruthy();
    expect(queryByText("Weight")).toBeTruthy();
    expect(queryByText("PCOS")).toBeNull();
  });

  it("female user sees Hair Loss, Weight, PCOS (no ED, PE)", () => {
    const { queryByText } = render(
      <TestProvider scenario="active">
        <ExploreIndex />
      </TestProvider>,
    );
    expect(queryByText("Hair Loss")).toBeTruthy();
    expect(queryByText("Weight")).toBeTruthy();
    expect(queryByText("PCOS")).toBeTruthy();
    expect(queryByText("ED")).toBeNull();
    expect(queryByText("PE")).toBeNull();
  });
});
