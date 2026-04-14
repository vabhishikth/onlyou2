import { create } from "zustand";

import type { Vertical } from "@/fixtures/patient-states";

export type Answer = string | string[];

interface QuestionnaireState {
  /** Currently active condition — set when a questionnaire starts. */
  condition: Vertical | null;
  /** Map of question id -> answer value. */
  answers: Record<string, Answer>;
  /** Start (or restart) a questionnaire for the given condition. */
  start: (condition: Vertical) => void;
  /** Set the answer for a given question id. */
  setAnswer: (qid: string, value: Answer) => void;
  /** Get the answer for a given question id. */
  getAnswer: (qid: string) => Answer | undefined;
  /** Reset all state (e.g. after submit or dismiss). */
  reset: () => void;
}

export const useQuestionnaireStore = create<QuestionnaireState>((set, get) => ({
  condition: null,
  answers: {},
  start(condition) {
    set({ condition, answers: {} });
  },
  setAnswer(qid, value) {
    set((s) => ({ answers: { ...s.answers, [qid]: value } }));
  },
  getAnswer(qid) {
    return get().answers[qid];
  },
  reset() {
    set({ condition: null, answers: {} });
  },
}));
