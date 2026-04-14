import { FIXTURES, type FixtureUser } from "@/fixtures/patient-states";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";

export function usePatientState(): FixtureUser {
  const scenario = useDevScenarioStore((s) => s.activeScenario);
  return FIXTURES[scenario];
}
