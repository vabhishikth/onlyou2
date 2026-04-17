import { useDevScenarioStore } from "../stores/dev-scenario-store";

import { useCurrentUser } from "./use-current-user";
import { usePatientState } from "./use-patient-state";

import type { Gender } from "@/fixtures/patient-states";

/**
 * Identity used for display surfaces (home greeting, tabs header avatar,
 * profile screen). When the dev switcher flipped the scenario, returns
 * the fixture's identity so the whole UI reads as that demo user. Flow-
 * driven scenarios (real submit / real pay) and normal signed-in sessions
 * return the real Convex user.
 *
 * Use this for DISPLAY only. Auth routing and server mutations must still
 * read `useCurrentUser` directly so they see the real signed-in session.
 */
export interface DisplayUser {
  name: string | null | undefined;
  phone: string | null | undefined;
  gender: Gender | null | undefined;
}

export function useDisplayUser(): DisplayUser | null | undefined {
  const currentUser = useCurrentUser();
  const patient = usePatientState();
  const lastSource = useDevScenarioStore((s) => s.lastSource);
  const activeUserId = useDevScenarioStore((s) => s.activeUserId);

  // Only swap to the fixture identity when the dev switcher flipped the
  // scenario for a signed-in user. `setActiveUser(null)` resets
  // `lastSource` today, so this activeUserId guard is defensive against
  // any future drift where the two drift apart.
  if (lastSource === "dev" && activeUserId) {
    return {
      name: patient.name,
      phone: patient.phone,
      gender: patient.gender,
    };
  }
  if (currentUser === undefined) return undefined;
  if (currentUser === null) return null;
  return {
    name: currentUser.name,
    phone: currentUser.phone,
    gender: (currentUser.gender ?? null) as Gender | null,
  };
}
