import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const { router } = require("expo-router");

const Payment = require("../../../app/treatment/payment").default;

describe("Treatment payment screen (mocked Razorpay)", () => {
  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders summary, lets user switch method, and routes to subscription-confirmed after simulated pay", async () => {
    const { getByText } = render(
      <TestProvider scenario="ready">
        <Payment />
      </TestProvider>,
    );

    expect(getByText("Payment")).toBeTruthy();
    expect(getByText("Order summary")).toBeTruthy();
    expect(getByText("UPI")).toBeTruthy();
    expect(getByText("Card")).toBeTruthy();
    expect(getByText("Pay ₹2,299")).toBeTruthy();

    fireEvent.press(getByText("Card"));
    fireEvent.press(getByText("Pay ₹2,299"));

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(
        "/treatment/subscription-confirmed",
      );
    });
  });
});
