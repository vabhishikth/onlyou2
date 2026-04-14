import type { ReactNode } from "react";

import type { PatientState } from "@/fixtures/patient-states";

interface TestProviderProps {
  scenario?: PatientState;
  children: ReactNode;
}

/**
 * Wraps a component tree for tests. Sets the dev scenario store to the
 * given scenario before render so `usePatientState()` returns that fixture.
 * The store import is lazy to avoid circular deps with the fixture file.
 */
export function TestProvider({
  scenario = "new",
  children,
}: TestProviderProps) {
  // Lazy import keeps test-utils independent of store init order
  const { useDevScenarioStore } = require("@/stores/dev-scenario-store");
  useDevScenarioStore.setState({ activeScenario: scenario });
  return <>{children}</>;
}
