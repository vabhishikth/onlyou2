import { fireEvent, render } from "@testing-library/react-native";

import { PhoneInput } from "@/components/auth/PhoneInput";

describe("<PhoneInput>", () => {
  it("calls onChangeText with digits only", () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PhoneInput onChangeText={onChangeText} testID="phone" />,
    );
    fireEvent.changeText(getByTestId("phone"), "98 765 43210");
    expect(onChangeText).toHaveBeenCalledWith("9876543210");
  });

  it("caps input at 10 digits", () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PhoneInput onChangeText={onChangeText} testID="phone" />,
    );
    fireEvent.changeText(getByTestId("phone"), "98765432101234");
    expect(onChangeText).toHaveBeenLastCalledWith("9876543210");
  });
});
