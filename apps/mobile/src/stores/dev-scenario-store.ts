import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PatientState, Vertical } from "@/fixtures/patient-states";

/**
 * How the active scenario was most recently set. "flow" means the real
 * user progressed through the app (submit → reviewing, pay → active).
 * "dev" means the triple-tap switcher was used to demo a fixture. Home
 * reads this to decide whether to greet with the real user's name
 * (flow) or the fixture's name (dev), so dev walkthroughs stay coherent.
 */
export type ScenarioSource = "flow" | "dev";

interface SetScenarioOpts {
  /** When a flow progression carries a user-selected vertical, pin it
   * into the per-user map so home cards can display the right label
   * even though the underlying fixture is hardcoded (Phase 2C). */
  vertical?: Vertical;
  /** Defaults to "dev" — everything that isn't flow-driven is a demo. */
  source?: ScenarioSource;
}

interface DevScenarioState {
  /** Currently-displayed patient scenario — what home/explore/etc render. */
  activeScenario: PatientState;
  /** Which real user the `activeScenario` belongs to, or null when signed out. */
  activeUserId: string | null;
  /** Per-user record of the last scenario each user was on. */
  scenariosByUser: Record<string, PatientState>;
  /** Per-user override of the vertical shown on home cards — set when a
   * real flow submit happens so the review/plan/active cards label the
   * vertical the user actually picked, not the fixture's hardcoded one. */
  verticalsByUser: Record<string, Vertical>;
  /** How `activeScenario` was last set. Null only at first boot / reset. */
  lastSource: ScenarioSource | null;

  setScenario: (state: PatientState, opts?: SetScenarioOpts) => void;
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
          verticalsByUser: {},
          lastSource: null,

          setScenario: (scenario, opts) => {
            const { activeUserId, scenariosByUser, verticalsByUser } = get();
            const source: ScenarioSource = opts?.source ?? "dev";
            const nextScenarios = activeUserId
              ? { ...scenariosByUser, [activeUserId]: scenario }
              : scenariosByUser;
            const nextVerticals =
              activeUserId && opts?.vertical
                ? { ...verticalsByUser, [activeUserId]: opts.vertical }
                : verticalsByUser;
            set({
              activeScenario: scenario,
              scenariosByUser: nextScenarios,
              verticalsByUser: nextVerticals,
              lastSource: source,
            });
          },

          setActiveUser: (userId) => {
            if (userId === null) {
              set({
                activeUserId: null,
                activeScenario: "new",
                lastSource: null,
              });
              return;
            }
            const { scenariosByUser } = get();
            set({
              activeUserId: userId,
              activeScenario: scenariosByUser[userId] ?? "new",
              lastSource: null,
            });
          },

          resetScenario: () =>
            set({
              activeScenario: "new",
              activeUserId: null,
              scenariosByUser: {},
              verticalsByUser: {},
              lastSource: null,
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
      verticalsByUser: {},
      lastSource: null,
      setScenario: () => {},
      setActiveUser: () => {},
      resetScenario: () => {},
    }));
