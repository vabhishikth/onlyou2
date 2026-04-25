import { create } from "zustand";

import type { Id } from "../../../../convex/_generated/dataModel";

import type { Vertical } from "@/fixtures/patient-states";

export type Answer = string | string[];

interface QuestionnaireState {
  /** Currently active condition — set when a questionnaire starts. */
  condition: Vertical | null;
  /** Schema version of the active questionnaire (e.g. "hair-loss-v1"). */
  schemaVersion: string | null;
  /** Currently active question id. */
  currentQid: string | null;
  /** Stack of visited qids for back-nav. */
  history: string[];
  /** Map of question id -> answer value. */
  answers: Record<string, Answer>;
  /** Map of photo slot label -> captured URI (Phase 2 uses mock URIs). */
  photoUris: Record<string, string>;
  /** Server-issued consultation id for the in-flight flow (Phase 3B). */
  consultationId: Id<"consultations"> | null;
  /** Set the server-issued consultation id (called after startConsultation). */
  setConsultationId: (id: Id<"consultations"> | null) => void;
  /** Start (or restart) a questionnaire for the given condition. */
  start: (condition: Vertical) => void;
  /** Start the hair-loss questionnaire with schema version + first qid. */
  startHL: (schemaVersion: string, firstQid: string) => void;
  /** Push currentQid onto history and move to nextQid. */
  advance: (currentQid: string, nextQid: string | null) => void;
  /** Pop history; returns the prev qid or null when history is empty. */
  goBack: () => string | null;
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
  schemaVersion: null,
  currentQid: null,
  history: [],
  answers: {},
  photoUris: {},
  consultationId: null,
  setConsultationId(id) {
    set({ consultationId: id });
  },
  start(condition) {
    set({
      condition,
      schemaVersion: null,
      currentQid: null,
      history: [],
      answers: {},
      photoUris: {},
      consultationId: null,
    });
  },
  startHL(schemaVersion, firstQid) {
    set({
      condition: "hair-loss",
      schemaVersion,
      answers: {},
      photoUris: {},
      currentQid: firstQid,
      history: [],
      consultationId: null,
    });
  },
  advance(currentQid, nextQid) {
    set((s) => ({
      history: [...s.history, currentQid],
      currentQid: nextQid,
    }));
  },
  goBack() {
    const { history } = get();
    if (history.length === 0) return null;
    const prev = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      currentQid: prev,
    });
    return prev;
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
    set({
      condition: null,
      schemaVersion: null,
      currentQid: null,
      history: [],
      answers: {},
      photoUris: {},
      consultationId: null,
    });
  },
}));
