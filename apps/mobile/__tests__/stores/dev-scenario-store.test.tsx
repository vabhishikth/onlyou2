import { act } from "@testing-library/react-native";

import { useDevScenarioStore } from "@/stores/dev-scenario-store";

describe("dev-scenario-store", () => {
  beforeEach(() => {
    act(() => {
      useDevScenarioStore.getState().resetScenario();
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

  it("scopes scenario per user — switching users restores their last state", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
      useDevScenarioStore.getState().setScenario("reviewing");
      useDevScenarioStore.getState().setActiveUser("user-b");
      useDevScenarioStore.getState().setScenario("active");
    });
    // Switch back to user A — should restore their "reviewing" state.
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("reviewing");
    // And back to user B.
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-b");
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("active");
  });

  it("signOut (setActiveUser null) drops active pointer but keeps the map", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
      useDevScenarioStore.getState().setScenario("ready");
      useDevScenarioStore.getState().setActiveUser(null);
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("new");
    expect(useDevScenarioStore.getState().activeUserId).toBeNull();
    // Re-login restores.
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("ready");
  });
});
