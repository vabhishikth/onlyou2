// Pure skip-logic helpers. No side effects. Operates on a snapshot of
// { answers, questions } and returns the reachable ordered list of qids
// or the next qid after a given one.

import type { Question } from "../data/questionnaires";

export type AnswersMap = Record<string, string | string[]>;

function isQuestionReachable(q: Question, answers: AnswersMap): boolean {
  // 1. Sex-gate — sexGate = "male" means skip when q2_sex !== "male" (and vice-versa).
  if (q.sexGate && answers.q2_sex !== q.sexGate) return false;

  // 2. skipIf rules — skip when ANY rule matches.
  if (q.skipIf) {
    for (const rule of q.skipIf) {
      const ans = answers[rule.qid];
      if (ans === undefined) continue;
      if (rule.mode === "equals") {
        if (typeof ans === "string" && rule.values.includes(ans)) return false;
      } else {
        // mode === "includes" — treat ans as array; skip if ANY rule value present
        const arr = Array.isArray(ans) ? ans : [ans];
        for (const v of rule.values) if (arr.includes(v)) return false;
      }
    }
  }

  return true;
}

export function getReachableQids(
  questions: Question[],
  answers: AnswersMap,
): string[] {
  return questions
    .filter((q) => isQuestionReachable(q, answers))
    .map((q) => q.id);
}

export function getNextQid(
  questions: Question[],
  answers: AnswersMap,
  currentQid: string,
): string | null {
  const reached = getReachableQids(questions, answers);
  const idx = reached.indexOf(currentQid);
  if (idx < 0 || idx === reached.length - 1) return null;
  return reached[idx + 1];
}
