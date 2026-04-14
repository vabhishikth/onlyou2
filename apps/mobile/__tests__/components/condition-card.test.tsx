import { fireEvent, render } from "@testing-library/react-native";

import { ConditionCard } from "@/components/explore/ConditionCard";
import { VERTICALS } from "@/fixtures/verticals";

describe("<ConditionCard>", () => {
  it("renders displayName and category when available", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ConditionCard
        info={VERTICALS["hair-loss"]}
        isActive={false}
        onPress={onPress}
      />,
    );
    expect(getByText("Hair Loss")).toBeTruthy();
    expect(getByText("Hair & Scalp")).toBeTruthy();
    expect(getByText(/Start/)).toBeTruthy();
  });

  it("shows Active label when isActive", () => {
    const { getByText, queryByText } = render(
      <ConditionCard
        info={VERTICALS["hair-loss"]}
        isActive={true}
        onPress={jest.fn()}
      />,
    );
    expect(getByText("Active")).toBeTruthy();
    expect(queryByText("Hair & Scalp")).toBeNull();
  });

  it("shows Coming soon and em-dash CTA when not available in phase 2", () => {
    const { getByText, queryByText } = render(
      <ConditionCard
        info={VERTICALS.pe}
        isActive={false}
        onPress={jest.fn()}
      />,
    );
    expect(getByText("PE")).toBeTruthy();
    expect(getByText("Coming soon")).toBeTruthy();
    expect(getByText("—")).toBeTruthy();
    expect(queryByText(/Start/)).toBeNull();
  });

  it("fires onPress when available vertical is tapped", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ConditionCard
        info={VERTICALS["hair-loss"]}
        isActive={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByText("Hair Loss"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
