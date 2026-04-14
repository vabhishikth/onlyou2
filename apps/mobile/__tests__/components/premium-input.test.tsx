import { fireEvent, render } from "@testing-library/react-native";

import { PremiumInput } from "@/components/ui/PremiumInput";

describe("<PremiumInput>", () => {
  it("renders the label as a floating element", () => {
    const { getByText } = render(<PremiumInput label="Phone number" />);
    expect(getByText("Phone number")).toBeTruthy();
  });

  it("calls onChangeText when the user types", () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PremiumInput
        label="Phone number"
        testID="phone-input"
        onChangeText={onChangeText}
      />,
    );
    fireEvent.changeText(getByTestId("phone-input"), "9876543210");
    expect(onChangeText).toHaveBeenCalledWith("9876543210");
  });

  it("shows error text when error prop is set", () => {
    const { getByText } = render(
      <PremiumInput label="Phone number" error="Invalid number" />,
    );
    expect(getByText("Invalid number")).toBeTruthy();
  });

  it("applies disabled styling when editable is false", () => {
    const { getByTestId } = render(
      <PremiumInput
        label="Phone number"
        testID="phone-input"
        editable={false}
      />,
    );
    expect(getByTestId("phone-input").props.editable).toBe(false);
  });
});
