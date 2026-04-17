import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

const mockParams: { orderId: string } = { orderId: "o-sanjana-1" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const ActivityDetail =
  require("../../../app/(tabs)/activity/[orderId]").default;

describe("Activity tab — order detail", () => {
  beforeEach(() => {
    mockParams.orderId = "o-sanjana-1";
  });

  it("renders the delivery stepper for sanjana's active order", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        <ActivityDetail />
      </TestProvider>,
    );
    expect(getByText(/Order o-sanjana-1/)).toBeTruthy();
    expect(getByText("Preparing")).toBeTruthy();
    expect(getByText("Dispatched")).toBeTruthy();
    expect(getByText("Out for delivery")).toBeTruthy();
    expect(getByText("Delivered")).toBeTruthy();
  });

  it("renders not-found state when the order id does not match", () => {
    mockParams.orderId = "does-not-exist";
    const { getByText } = render(
      <TestProvider scenario="active">
        <ActivityDetail />
      </TestProvider>,
    );
    expect(getByText(/Order not found/)).toBeTruthy();
  });
});
