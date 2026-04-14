import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";

function Probe() {
  const user = usePatientState();
  return (
    <Text testID="probe">{`${user.name}|${user.state}|${user.gender}`}</Text>
  );
}

describe("usePatientState", () => {
  it("returns Arjun (male, new) when the store is new", () => {
    useDevScenarioStore.setState({ activeScenario: "new" });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").props.children).toBe("Arjun Sharma|new|male");
  });

  it("returns Sanjana (female, active) when the store is active", () => {
    useDevScenarioStore.setState({ activeScenario: "active" });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").props.children).toBe(
      "Sanjana Rao|active|female",
    );
  });

  it("updates reactively when the store changes", () => {
    useDevScenarioStore.setState({ activeScenario: "new" });
    const { getByTestId, rerender } = render(<Probe />);
    expect(getByTestId("probe").props.children).toBe("Arjun Sharma|new|male");
    useDevScenarioStore.setState({ activeScenario: "ready" });
    rerender(<Probe />);
    expect(getByTestId("probe").props.children).toBe("Rahul Mehta|ready|male");
  });
});
