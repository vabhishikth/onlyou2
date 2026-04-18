// convex/lib/claude.ts
//
// Centralized Claude API constants and call-site stubs. Phase 2.5A ships
// the constants and fail-loud stubs. Phase 2.5B wires the real Anthropic
// client. Model IDs MUST be verified against current Anthropic docs at
// implementation time in 2.5B (via Context7 / web fetch) — never
// hard-coded from memory or session state. See
// docs/decisions/2026-04-17-claude-vision-native-parsing.md.

export const MODEL_EXTRACTION = "VERIFY_AT_IMPLEMENTATION_PLAN_2_5B";
export const MODEL_NARRATIVE = "VERIFY_AT_IMPLEMENTATION_PLAN_2_5B";

export interface ExtractMarkersInput {
  fileBase64: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
}

export interface ExtractedPayload {
  is_lab_report: boolean;
  patient_name_on_report: string | null;
  collection_date: string | null;
  markers: Array<{
    name_on_report: string;
    canonical_id_guess: string | null;
    qualifier: string | null;
    value_type: "numeric" | "qualitative";
    raw_value: string;
    numeric_value: number | null;
    raw_unit: string | null;
    lab_printed_range: string | null;
    page_number: number;
    confidence: number;
  }>;
}

export interface GenerateNarrativeInput {
  markers: Array<{
    canonicalId: string | null;
    displayName: string;
    status: "optimal" | "sub_optimal" | "action_required" | "unclassified";
    category: string | null;
  }>;
}

export async function extractMarkers(
  _input: ExtractMarkersInput,
): Promise<ExtractedPayload> {
  throw new Error(
    "extractMarkers: not wired yet — ships in Phase 2.5B. See plan 2.5B Task N.",
  );
}

export async function generateNarrative(
  _input: GenerateNarrativeInput,
): Promise<string> {
  throw new Error(
    "generateNarrative: not wired yet — ships in Phase 2.5B. See plan 2.5B Task N.",
  );
}
