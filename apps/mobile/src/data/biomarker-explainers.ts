/**
 * biomarker-explainers.ts
 *
 * Maps biomarker id → plain-language lifestyle explainer string.
 * Ported from the Claude Design Bundle web prototype (detail.jsx:180-188).
 *
 * Usage:
 *   import { explainerFor } from '@/data/biomarker-explainers';
 *   const text = explainerFor(b.id, b.name);
 */

const EXPLAINER_MAP: Record<string, string> = {
  ldl: "Slightly elevated. A trend downward is visible — keep moving. Prioritize soluble fibre, olive oil, and reduce saturated fat.",
  hdl: "Edging toward the protective band. Continue resistance training and Omega-3 rich foods to raise it further.",
  vitd: "Sub-optimal for a tropical resident. 15 min morning sun + 2,000 IU supplement for six weeks, then retest.",
  apob: "Borderline. ApoB is a better predictor than LDL — worth watching alongside LDL-C.",
  homo: "Slightly above optimal. B-complex (B6, B9, B12) and reduced processed carbs will help.",
};

/**
 * Returns a lifestyle explainer for the given biomarker.
 *
 * @param id   - The biomarker id (e.g. "ldl", "vitd").
 * @param name - The human-readable biomarker name used in the fallback template.
 */
export function explainerFor(id: string, name: string): string {
  return (
    EXPLAINER_MAP[id] ??
    `Your ${name.toLowerCase()} sits comfortably within the optimal window. Maintain current habits — sleep, nutrition, movement — and retest in 90 days.`
  );
}
