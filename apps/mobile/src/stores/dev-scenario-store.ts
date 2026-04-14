import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PatientState } from "@/fixtures/patient-states";

interface DevScenarioState {
  activeScenario: PatientState;
  setScenario: (state: PatientState) => void;
  resetScenario: () => void;
}

export const useDevScenarioStore = __DEV__
  ? create<DevScenarioState>()(
      persist(
        (set) => ({
          activeScenario: "new",
          setScenario: (scenario) => set({ activeScenario: scenario }),
          resetScenario: () => set({ activeScenario: "new" }),
        }),
        {
          name: "onlyou.dev.scenario",
          storage: createJSONStorage(() => AsyncStorage),
        },
      ),
    )
  : create<DevScenarioState>(() => ({
      activeScenario: "new",
      setScenario: () => {},
      resetScenario: () => {},
    }));
