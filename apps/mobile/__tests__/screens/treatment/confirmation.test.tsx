import { fireEvent, render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const { router } = require("expo-router");

const Confirmation = require("../../../app/treatment/confirmation").default;

describe("Treatment confirmation screen", () => {
  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
  });

  it("renders the submitted-for-review headline and routes home on CTA", () => {
    const { getByText } = render(
      <TestProvider scenario="reviewing">
        <Confirmation />
      </TestProvider>,
    );
    expect(getByText("Submitted for review")).toBeTruthy();
    expect(
      getByText(/A doctor will review your case within 24 hours/),
    ).toBeTruthy();
    fireEvent.press(getByText("Back to home"));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/home");
  });
});
