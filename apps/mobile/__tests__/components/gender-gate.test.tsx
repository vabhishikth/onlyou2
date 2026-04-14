import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { GenderGate } from "@/components/gender-gate";
import { TestProvider } from "@/test-utils";

describe("<GenderGate>", () => {
  it("renders children when the active scenario gender is in allow list", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        <GenderGate allow={["female"]}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(getByText("visible")).toBeTruthy();
  });

  it("renders nothing when the active scenario gender is not in allow list", () => {
    const { queryByText } = render(
      <TestProvider scenario="new">
        <GenderGate allow={["female"]}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(queryByText("visible")).toBeNull();
  });

  it("renders a fallback when provided and the gender is not allowed", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <GenderGate allow={["female"]} fallback={<Text>not available</Text>}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(getByText("not available")).toBeTruthy();
  });

  it('allows "other" through when in the allow list', () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <GenderGate allow={["male", "other"]}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(getByText("visible")).toBeTruthy();
  });
});
