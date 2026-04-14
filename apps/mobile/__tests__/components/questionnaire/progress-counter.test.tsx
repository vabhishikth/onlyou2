import { render } from "@testing-library/react-native";

import { ProgressCounter } from "@/components/questionnaire/ProgressCounter";

describe("<ProgressCounter>", () => {
  it("renders the current / total label", () => {
    const { getByText } = render(<ProgressCounter current={2} total={7} />);
    expect(getByText("2 of 7")).toBeTruthy();
  });

  it("handles the first step", () => {
    const { getByText } = render(<ProgressCounter current={1} total={5} />);
    expect(getByText("1 of 5")).toBeTruthy();
  });

  it("handles completion without crashing", () => {
    const { getByText } = render(<ProgressCounter current={5} total={5} />);
    expect(getByText("5 of 5")).toBeTruthy();
  });
});
