import { create } from "zustand";

import type { Vertical } from "@/fixtures/patient-states";

export type Answer = string | string[];

interface QuestionnaireState {
  /** Currently active condition — set when a questionnaire starts. */
  condition: Vertical | null;
  /** Map of question id -> answer value. */
  answers: Record<string, Answer>;
  /** Map of photo slot label -> captured URI (Phase 2 uses mock URIs). */
  photoUris: Record<string, string>;
  /** Start (or restart) a questionnaire for the given condition. */
  start: (condition: Vertical) => void;
  /** Set the answer for a given question id. */
  setAnswer: (qid: string, value: Answer) => void;
  /** Get the answer for a given question id. */
  getAnswer: (qid: string) => Answer | undefined;
  /** Record a captured photo URI for a given slot label. */
  setPhotoUri: (slot: string, uri: string) => void;
  /** Reset all state (e.g. after submit or dismiss). */
  reset: () => void;
}

export const useQuestionnaireStore = create<QuestionnaireState>((set, get) => ({
  condition: null,
  answers: {},
  photoUris: {},
  start(condition) {
    set({ condition, answers: {}, photoUris: {} });
  },
  setAnswer(qid, value) {
    set((s) => ({ answers: { ...s.answers, [qid]: value } }));
  },
  getAnswer(qid) {
    return get().answers[qid];
  },
  setPhotoUri(slot, uri) {
    set((s) => ({ photoUris: { ...s.photoUris, [slot]: uri } }));
  },
  reset() {
    set({ condition: null, answers: {}, photoUris: {} });
  },
}));
