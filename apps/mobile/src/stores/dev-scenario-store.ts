/**
 * Minimal stub for the dev scenario store.
 * Fully implemented in Task 11. Used by TestProvider in tests.
 */
import { create } from "zustand";

import type { PatientState } from "@/fixtures/patient-states";

interface DevScenarioState {
  activeScenario: PatientState;
  setScenario: (scenario: PatientState) => void;
}

export const useDevScenarioStore = create<DevScenarioState>((set) => ({
  activeScenario: "new",
  setScenario: (scenario) => set({ activeScenario: scenario }),
}));
