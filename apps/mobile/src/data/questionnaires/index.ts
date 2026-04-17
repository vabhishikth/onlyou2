import type { Vertical } from "../../fixtures/patient-states";

import { edQuestions } from "./ed";
import { hairLossQuestions } from "./hair-loss";

export type QuestionType = "single" | "multi" | "text" | "photo";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  helper?: string;
  options?: Array<{ value: string; label: string }>;
  required: boolean;
}

export const QUESTION_BANKS: Partial<Record<Vertical, Question[]>> = {
  "hair-loss": hairLossQuestions,
  ed: edQuestions,
};

export function getQuestionBank(vertical: Vertical): Question[] | undefined {
  return QUESTION_BANKS[vertical];
}

export { edQuestions, hairLossQuestions };
