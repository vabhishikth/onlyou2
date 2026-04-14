import { fireEvent, render } from "@testing-library/react-native";

import { ScenarioSwitcher } from "@/dev/scenario-switcher";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";

describe("<ScenarioSwitcher>", () => {
  beforeEach(() => {
    useDevScenarioStore.setState({ activeScenario: "new" });
  });

  it("lists all four scenarios when open", () => {
    const { getByText } = render(
      <ScenarioSwitcher visible onClose={() => {}} />,
    );
    expect(getByText("Arjun Sharma")).toBeTruthy();
    expect(getByText("Priya Iyer")).toBeTruthy();
    expect(getByText("Rahul Mehta")).toBeTruthy();
    expect(getByText("Sanjana Rao")).toBeTruthy();
  });

  it("flips the active scenario when a row is tapped", () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ScenarioSwitcher visible onClose={onClose} />,
    );
    fireEvent.press(getByText("Sanjana Rao"));
    expect(useDevScenarioStore.getState().activeScenario).toBe("active");
    expect(onClose).toHaveBeenCalled();
  });
});
