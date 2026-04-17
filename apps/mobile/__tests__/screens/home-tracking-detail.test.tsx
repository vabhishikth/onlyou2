import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

const mockParams: { id: string } = { id: "o-sanjana-1" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const TrackingDetail = require("../../app/(tabs)/home/tracking/[id]").default;

describe("Home tracking detail", () => {
  beforeEach(() => {
    mockParams.id = "o-sanjana-1";
  });

  it("renders the stepper for sanjana's active delivery", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        <TrackingDetail />
      </TestProvider>,
    );
    expect(getByText("Delivery tracking")).toBeTruthy();
    expect(getByText(/Order o-sanjana-1/)).toBeTruthy();
    expect(getByText("Preparing")).toBeTruthy();
    expect(getByText("Dispatched")).toBeTruthy();
    expect(getByText("Out for delivery")).toBeTruthy();
    expect(getByText("Delivered")).toBeTruthy();
  });

  it("renders not-found state when the order id does not match", () => {
    mockParams.id = "does-not-exist";
    const { getByText } = render(
      <TestProvider scenario="active">
        <TrackingDetail />
      </TestProvider>,
    );
    expect(getByText(/Order not found/)).toBeTruthy();
  });
});
