import { fireEvent, render } from "@testing-library/react-native";

import { PremiumButton } from "@/components/ui/PremiumButton";

describe("<PremiumButton>", () => {
  it("renders the label", () => {
    const { getByText } = render(
      <PremiumButton label="Continue" onPress={() => {}} />,
    );
    expect(getByText("Continue")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PremiumButton label="Continue" onPress={onPress} />,
    );
    fireEvent.press(getByText("Continue"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PremiumButton label="Continue" disabled onPress={onPress} />,
    );
    fireEvent.press(getByText("Continue"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("accepts all four variants without crashing", () => {
    const variants: Array<"primary" | "secondary" | "ghost" | "warm"> = [
      "primary",
      "secondary",
      "ghost",
      "warm",
    ];
    for (const v of variants) {
      const { getByText, unmount } = render(
        <PremiumButton label={v} variant={v} onPress={() => {}} />,
      );
      expect(getByText(v)).toBeTruthy();
      unmount();
    }
  });
});
