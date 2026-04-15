import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PatientState } from "@/fixtures/patient-states";

interface DevScenarioState {
  /** Currently-displayed patient scenario — what home/explore/etc render. */
  activeScenario: PatientState;
  /** Which real user the `activeScenario` belongs to, or null when signed out. */
  activeUserId: string | null;
  /** Per-user record of the last scenario each user was on. */
  scenariosByUser: Record<string, PatientState>;

  setScenario: (state: PatientState) => void;
  /**
   * Switch the active user. Loads that user's persisted scenario (or "new"
   * if they're brand new). Pass `null` on sign-out — keeps the per-user
   * map intact so re-login restores state.
   */
  setActiveUser: (userId: string | null) => void;
  /** Hard reset — only for tests. Wipes the per-user map too. */
  resetScenario: () => void;
}

export const useDevScenarioStore = __DEV__
  ? create<DevScenarioState>()(
      persist(
        (set, get) => ({
          activeScenario: "new",
          activeUserId: null,
          scenariosByUser: {},

          setScenario: (scenario) => {
            const { activeUserId, scenariosByUser } = get();
            const nextMap = activeUserId
              ? { ...scenariosByUser, [activeUserId]: scenario }
              : scenariosByUser;
            set({ activeScenario: scenario, scenariosByUser: nextMap });
          },

          setActiveUser: (userId) => {
            if (userId === null) {
              set({ activeUserId: null, activeScenario: "new" });
              return;
            }
            const { scenariosByUser } = get();
            set({
              activeUserId: userId,
              activeScenario: scenariosByUser[userId] ?? "new",
            });
          },

          resetScenario: () =>
            set({
              activeScenario: "new",
              activeUserId: null,
              scenariosByUser: {},
            }),
        }),
        {
          name: "onlyou.dev.scenario",
          storage: createJSONStorage(() => AsyncStorage),
        },
      ),
    )
  : create<DevScenarioState>(() => ({
      activeScenario: "new",
      activeUserId: null,
      scenariosByUser: {},
      setScenario: () => {},
      setActiveUser: () => {},
      resetScenario: () => {},
    }));
