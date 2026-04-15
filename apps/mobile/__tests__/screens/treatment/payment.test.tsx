import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

const mockParams: { plan?: string; vertical?: string } = {};

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const { router } = require("expo-router");

const Payment = require("../../../app/treatment/payment").default;

describe("Treatment payment screen (mocked Razorpay)", () => {
  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
    mockParams.plan = undefined;
    mockParams.vertical = undefined;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders hair-loss quarterly summary and routes to subscription-confirmed after simulated pay", async () => {
    mockParams.plan = "quarterly";
    mockParams.vertical = "hair-loss";

    const { getByText } = render(
      <TestProvider scenario="ready">
        <Payment />
      </TestProvider>,
    );

    expect(getByText("Payment")).toBeTruthy();
    expect(getByText("Order summary")).toBeTruthy();
    expect(getByText("UPI")).toBeTruthy();
    expect(getByText("Card")).toBeTruthy();
    expect(getByText("Quarterly plan")).toBeTruthy();
    // Hair-loss quarterly = ₹2,499
    expect(getByText("Pay ₹2,499")).toBeTruthy();

    fireEvent.press(getByText("Card"));
    fireEvent.press(getByText("Pay ₹2,499"));

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(
        "/treatment/subscription-confirmed",
      );
    });
  });

  it("renders hair-loss 6-month plan total when that plan is selected upstream", () => {
    mockParams.plan = "six-month";
    mockParams.vertical = "hair-loss";

    const { getByText } = render(
      <TestProvider scenario="ready">
        <Payment />
      </TestProvider>,
    );

    expect(getByText("6-month plan")).toBeTruthy();
    // Hair-loss six-month = ₹4,499
    expect(getByText("Pay ₹4,499")).toBeTruthy();
  });
});
