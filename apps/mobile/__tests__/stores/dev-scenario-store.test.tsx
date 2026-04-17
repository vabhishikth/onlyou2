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

  it("setScenario defaults lastSource to 'dev' when no opts passed", () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("active");
    });
    expect(useDevScenarioStore.getState().lastSource).toBe("dev");
  });

  it("setScenario records the source when provided", () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("reviewing", {
        source: "flow",
      });
    });
    expect(useDevScenarioStore.getState().lastSource).toBe("flow");
  });

  it("persists a flow-carried vertical per user", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
      useDevScenarioStore.getState().setScenario("reviewing", {
        vertical: "ed",
        source: "flow",
      });
    });
    expect(useDevScenarioStore.getState().verticalsByUser["user-a"]).toBe("ed");
  });

  it("keeps the vertical override when setScenario is called without a vertical", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
      useDevScenarioStore.getState().setScenario("reviewing", {
        vertical: "ed",
        source: "flow",
      });
      // Subsequent flow step (e.g. pay → active) shouldn't clobber the
      // vertical just because it omits the opts param.
      useDevScenarioStore.getState().setScenario("active", { source: "flow" });
    });
    expect(useDevScenarioStore.getState().verticalsByUser["user-a"]).toBe("ed");
  });

  it("does not touch verticalsByUser when no user is active", () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("reviewing", {
        vertical: "ed",
        source: "flow",
      });
    });
    expect(useDevScenarioStore.getState().verticalsByUser).toEqual({});
  });

  it("setActiveUser resets lastSource so the next render picks it up fresh", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
      useDevScenarioStore.getState().setScenario("active", { source: "dev" });
      useDevScenarioStore.getState().setActiveUser("user-b");
    });
    expect(useDevScenarioStore.getState().lastSource).toBeNull();
  });

  it("resetScenario wipes verticalsByUser and lastSource too", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-a");
      useDevScenarioStore.getState().setScenario("reviewing", {
        vertical: "ed",
        source: "flow",
      });
      useDevScenarioStore.getState().resetScenario();
    });
    expect(useDevScenarioStore.getState().verticalsByUser).toEqual({});
    expect(useDevScenarioStore.getState().lastSource).toBeNull();
  });
});
