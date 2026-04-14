import { usePatientState } from "./use-patient-state";

export type Gender = "male" | "female" | "other";

export function useGender(): Gender {
  return usePatientState().gender;
}
