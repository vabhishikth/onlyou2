import { fireEvent, render } from "@testing-library/react-native";

import { SelectionCard } from "@/components/questionnaire/SelectionCard";

describe("<SelectionCard>", () => {
  it("renders the label", () => {
    const { getByText } = render(
      <SelectionCard label="Mild" selected={false} onPress={() => {}} />,
    );
    expect(getByText("Mild")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SelectionCard label="Moderate" selected={false} onPress={onPress} />,
    );
    fireEvent.press(getByText("Moderate"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses radio role by default and checkbox role when multi", () => {
    const radio = render(
      <SelectionCard label="Single" selected={false} onPress={() => {}} />,
    );
    expect(radio.getByRole("radio")).toBeTruthy();
    radio.unmount();

    const check = render(
      <SelectionCard label="Multi" selected onPress={() => {}} multi />,
    );
    expect(check.getByRole("checkbox")).toBeTruthy();
  });

  it("shows the check glyph when selected", () => {
    const { getByText } = render(
      <SelectionCard label="Severe" selected onPress={() => {}} />,
    );
    expect(getByText("✓")).toBeTruthy();
  });
});
