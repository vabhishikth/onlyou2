import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";

describe("<BottomSheet>", () => {
  it("renders nothing when visible is false", () => {
    const { queryByText } = render(
      <BottomSheet visible={false} onClose={() => {}} title="Hello">
        <Text>content</Text>
      </BottomSheet>,
    );
    expect(queryByText("content")).toBeNull();
  });

  it("renders the title and children when visible", () => {
    const { getByText } = render(
      <BottomSheet visible onClose={() => {}} title="Pick a scenario">
        <Text>content</Text>
      </BottomSheet>,
    );
    expect(getByText("Pick a scenario")).toBeTruthy();
    expect(getByText("content")).toBeTruthy();
  });

  it("calls onClose when the overlay is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BottomSheet visible onClose={onClose} title="x" testID="sheet">
        <Text>content</Text>
      </BottomSheet>,
    );
    fireEvent.press(getByTestId("sheet-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
