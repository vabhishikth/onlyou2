// convex/biomarker/internal/generateNarrative.ts
import { callNarrative, type NarrativeInput } from "../../lib/claude";

export async function generateNarrativeWithGuard(input: NarrativeInput) {
  if (input.classifiedMarkers.length === 0) {
    return {
      narrative:
        "We found no markers on this report. Please re-upload a clearer image or a different file.",
      modelUsed: "fallback",
    };
  }
  return await callNarrative(input);
}
