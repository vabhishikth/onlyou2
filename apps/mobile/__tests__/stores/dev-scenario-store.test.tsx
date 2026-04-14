import { act } from "@testing-library/react-native";

import { useDevScenarioStore } from "@/stores/dev-scenario-store";

describe("dev-scenario-store", () => {
  beforeEach(() => {
    act(() => {
      useDevScenarioStore.setState({ activeScenario: "new" });
    });
  });

  it('starts with "new" as the default scenario', () => {
    expect(useDevScenarioStore.getState().activeScenario).toBe("new");
  });

  it("setScenario updates the active scenario", () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("active");
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("active");
  });

  it('resetScenario returns to "new"', () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("ready");
      useDevScenarioStore.getState().resetScenario();
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("new");
  });
});
