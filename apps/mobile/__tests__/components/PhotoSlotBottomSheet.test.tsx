import { fireEvent, render } from "@testing-library/react-native";

import { PhotoSlotBottomSheet } from "@/components/questionnaire/PhotoSlotBottomSheet";

describe("<PhotoSlotBottomSheet>", () => {
  it("renders both options and fires onSelect", () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <PhotoSlotBottomSheet
        visible={true}
        slot="crown"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByText("Take photo"));
    expect(onSelect).toHaveBeenCalledWith("camera");

    fireEvent.press(getByText("Choose from library"));
    expect(onSelect).toHaveBeenLastCalledWith("library");
  });

  it("does not render content when visible is false", () => {
    const { queryByText } = render(
      <PhotoSlotBottomSheet
        visible={false}
        slot="crown"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText("Take photo")).toBeNull();
  });
});
