import { fireEvent, render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const { router } = require("expo-router");

const PlanReady = require("../../../app/treatment/plan-ready").default;

describe("Treatment plan-ready screen", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
    (router.back as jest.Mock).mockClear();
  });

  it("renders doctor, diagnosis, meds list for ready fixture and routes to plan selection", () => {
    const { getByText } = render(
      <TestProvider scenario="ready">
        <PlanReady />
      </TestProvider>,
    );

    expect(getByText(/Dr\. Priya Sharma wrote your plan/)).toBeTruthy();
    expect(getByText("Dermatologist")).toBeTruthy();
    expect(
      getByText("Male pattern hair loss (Norwood Type III) — Moderate"),
    ).toBeTruthy();
    expect(getByText(/Finasteride 1mg/)).toBeTruthy();
    expect(getByText(/Minoxidil 5%/)).toBeTruthy();
    expect(getByText(/Biotin 10,000mcg/)).toBeTruthy();

    fireEvent.press(getByText("Choose your plan →"));
    expect(router.push).toHaveBeenCalledWith("/treatment/plan-selection");
  });

  it("shows an empty state when the fixture has no consultation", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <PlanReady />
      </TestProvider>,
    );
    expect(getByText("No plan in progress.")).toBeTruthy();
  });
});
