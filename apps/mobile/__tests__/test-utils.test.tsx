import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { TestProvider } from "@/test-utils";

describe("TestProvider", () => {
  it("renders children", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <Text>hello</Text>
      </TestProvider>,
    );
    expect(getByText("hello")).toBeTruthy();
  });
});
