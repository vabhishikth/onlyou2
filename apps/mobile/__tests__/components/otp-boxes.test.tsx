import { fireEvent, render } from "@testing-library/react-native";

import { OtpBoxes } from "@/components/auth/OtpBoxes";

describe("<OtpBoxes>", () => {
  it("renders 6 cells", () => {
    const { getAllByTestId } = render(<OtpBoxes onComplete={() => {}} />);
    expect(getAllByTestId(/otp-cell-/)).toHaveLength(6);
  });

  it("fires onComplete when 6 digits are entered", () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OtpBoxes onComplete={onComplete} />);
    fireEvent.changeText(getByTestId("otp-input"), "000000");
    expect(onComplete).toHaveBeenCalledWith("000000");
  });

  it("clears entered digits when resetSignal changes", () => {
    const { getByTestId, rerender } = render(
      <OtpBoxes onComplete={() => {}} resetSignal={0} />,
    );
    const input = getByTestId("otp-input");
    fireEvent.changeText(input, "123456");
    expect(input.props.value).toBe("123456");

    // Bumping the signal should clear the controlled value.
    rerender(<OtpBoxes onComplete={() => {}} resetSignal={1} />);
    expect(getByTestId("otp-input").props.value).toBe("");
  });

  it("does not clear on initial mount (first render is ignored)", () => {
    const { getByTestId } = render(
      <OtpBoxes onComplete={() => {}} resetSignal={7} />,
    );
    const input = getByTestId("otp-input");
    fireEvent.changeText(input, "42");
    // No re-render, the value must stick.
    expect(getByTestId("otp-input").props.value).toBe("42");
  });
});
