import type { Vertical } from "../../fixtures/patient-states";

import { edQuestions } from "./ed";
import { hairLossQuestions } from "./hair-loss";

export type QuestionType = "number" | "single" | "multi" | "photo" | "freetext";

export type Option = {
  value: string;
  label: string;
  maleOnly?: boolean;
  femaleOnly?: boolean;
};

export interface Question {
  id: string;
  type: QuestionType;
  section:
    | "basics"
    | "medical_history"
    | "current_symptoms"
    | "lifestyle"
    | "sexual_health"
    | "treatment_history";
  title: string;
  helper?: string;
  required: boolean;
  options?: Option[];
  maleOptions?: Option[];
  femaleOptions?: Option[];
  min?: number;
  max?: number;
  validationMessage?: string;
  skipIf?: Array<{
    qid: string;
    values: string[];
    mode: "equals" | "includes";
  }>;
  sexGate?: "male" | "female";
}

export const QUESTION_BANKS: Partial<Record<Vertical, Question[]>> = {
  "hair-loss": hairLossQuestions,
  ed: edQuestions,
};

export function getQuestionBank(vertical: Vertical): Question[] | undefined {
  return QUESTION_BANKS[vertical];
}

export { edQuestions, hairLossQuestions };
