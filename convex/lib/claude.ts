// convex/lib/claude.ts
//
// Real Anthropic SDK calls for the biomarker parse pipeline.
//
// Model IDs are verified against Anthropic's current docs via WebFetch at
// implementation time. Never hardcoded from training data.
// Verification source: https://docs.anthropic.com/en/docs/about-claude/models
// (redirects to https://platform.claude.com/docs/en/docs/about-claude/models)
// Last verified: 2026-04-18
//
// Models selected:
//   MODEL_EXTRACTION: claude-sonnet-4-6 — latest vision-capable Sonnet (1M ctx)
//   MODEL_NARRATIVE:  claude-sonnet-4-6 — same model; low-latency short-form calls
//
// Prompt caching: single cache_control breakpoint on the system prompt block
// (stable across all parse calls). The `extended-cache-ttl-2025-04-11` beta
// header gives 1-hour TTL instead of the default 5-min ephemeral, reducing
// re-write cost for high-throughput upload windows.
// Reference: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

import Anthropic from "@anthropic-ai/sdk";

// Verified via WebFetch on 2026-04-18 against
// https://platform.claude.com/docs/en/docs/about-claude/models
export const MODEL_EXTRACTION = "claude-sonnet-4-6"; // vision-capable Sonnet
export const MODEL_NARRATIVE = "claude-sonnet-4-6"; // Sonnet short-form
export const BETA_HEADER_EXTENDED_CACHE = "extended-cache-ttl-2025-04-11";

// ---------- Extraction ----------

export interface ExtractionInput {
  pdfBase64: string; // no data: prefix
  pdfMimeType: "application/pdf" | "image/jpeg" | "image/png";
  maxTokens?: number;
  followUpMessage?: string;
}

export interface ExtractedMarker {
  name_on_report: string;
  canonical_id_guess: string | null;
  raw_value: string;
  raw_unit: string | null;
  lab_printed_range: string | null;
  page_number: number;
  confidence: number; // 0..1
}

export interface ExtractionResponse {
  is_lab_report: boolean;
  patient_name_on_report: string;
  collection_date: string | null; // ISO date
  markers: ExtractedMarker[];
}

export interface RawClaudeResponse {
  stop_reason:
    | "end_turn"
    | "max_tokens"
    | "stop_sequence"
    | "tool_use"
    | string;
  content: Array<{ type: string; text?: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

const EXTRACTION_SYSTEM = `You extract biomarkers from Indian lab reports.

Return ONLY a JSON object with this exact shape (no prose, no markdown, no code fence):
{
  "is_lab_report": boolean,
  "patient_name_on_report": string,
  "collection_date": string | null,
  "markers": [
    {
      "name_on_report": string,
      "canonical_id_guess": string | null,
      "raw_value": string,
      "raw_unit": string | null,
      "lab_printed_range": string | null,
      "page_number": number,
      "confidence": number
    }
  ]
}

Rules:
- Never hallucinate. If a value is not visible, omit that marker.
- Cite page_number for every marker.
- collection_date is the sample collection date, not the report date.
- If this is not a lab report (prescription, receipt, random doc), return is_lab_report: false and markers: [].
- Extract every marker you can see — even ones you don't recognize. Put best-guess canonical_id in canonical_id_guess (lowercase_snake_case) or null if uncertain.
- Qualitative values (e.g. "Non-reactive", "1+", "trace") go in raw_value as-is.
`;

// Few-shot examples. Kept in-file for now — if they grow, split to a separate
// module loaded at cold-start. Each is a SYNTHETIC fixture extraction, NOT a
// real report.
// NOTE: Populated by Task 10; placeholder array here. The branch-coverage test
// (Task 16) verifies 8 items are present.
const FEW_SHOT_EXAMPLES: Array<{ role: "user" | "assistant"; text: string }> =
  [];

export async function callExtraction(
  input: ExtractionInput,
): Promise<ExtractionResponse> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Assemble messages: few-shot pairs (if any), then per-parse PDF.
  // Cache breakpoint is placed on the system prompt block — always stable,
  // always present regardless of few-shot count. This guarantees exactly 1
  // cache_control marker on every call, even when FEW_SHOT_EXAMPLES is empty.
  const fewShotMessages = FEW_SHOT_EXAMPLES.map((ex) => ({
    role: ex.role,
    content: [
      {
        type: "text" as const,
        text: ex.text,
      },
    ],
  }));

  const parseMessageContent: Array<{
    type: string;
    text?: string;
    source?: { type: string; media_type: string; data: string };
  }> = [
    {
      type: "text",
      text: "Extract all biomarkers from this report. Return ONLY the JSON object.",
    },
    {
      type: "document",
      source: {
        type: "base64",
        media_type: input.pdfMimeType,
        data: input.pdfBase64,
      },
    },
  ];

  if (input.followUpMessage) {
    parseMessageContent.push({ type: "text", text: input.followUpMessage });
  }

  const parseMessage = {
    role: "user" as const,
    content: parseMessageContent,
  };

  const response = (await client.messages.create({
    model: MODEL_EXTRACTION,
    max_tokens: input.maxTokens ?? 4096,
    system: [
      {
        type: "text",
        text: EXTRACTION_SYSTEM,
        // Cache the system prompt — it is the stable prefix shared across all
        // parse calls. The 1-hour TTL (via BETA_HEADER_EXTENDED_CACHE) means
        // even bursty upload windows won't re-write the cache between docs.
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [...fewShotMessages, parseMessage],
    betas: [BETA_HEADER_EXTENDED_CACHE],
  } as unknown as Parameters<
    typeof client.messages.create
  >[0])) as unknown as RawClaudeResponse;

  // Surface stop_reason to the caller via a thrown error if truncated;
  // caller handles max_tokens retry.
  if (response.stop_reason === "max_tokens") {
    const err = new Error("max_tokens") as Error & { stop_reason: string };
    err.stop_reason = "max_tokens";
    throw err;
  }

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock?.text) {
    throw new Error("No text content in Claude response");
  }

  return JSON.parse(textBlock.text) as ExtractionResponse;
}

// ---------- Narrative ----------

export interface NarrativeInput {
  classifiedMarkers: Array<{
    name: string;
    status: "optimal" | "sub_optimal" | "action_required" | "unclassified";
    value: number | string;
  }>;
}

export interface NarrativeResponse {
  narrative: string;
  modelUsed: string;
}

const NARRATIVE_SYSTEM = `Generate a 2-3 sentence plain-English summary of a patient's biomarker report.

Rules:
- Reference only the markers present.
- No numeric values, no medical advice.
- Warm, clear, non-alarmist tone.
- If all markers are optimal, say so simply.
- If any are action_required, acknowledge without dramatizing.
`;

export async function callNarrative(
  input: NarrativeInput,
): Promise<NarrativeResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const markerSummary = input.classifiedMarkers
    .map((m) => `- ${m.name}: ${m.status}`)
    .join("\n");
  const response = (await client.messages.create({
    model: MODEL_NARRATIVE,
    max_tokens: 500,
    system: NARRATIVE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here are the patient's biomarker statuses:\n${markerSummary}\n\nWrite the narrative.`,
      },
    ],
  } as unknown as Parameters<
    typeof client.messages.create
  >[0])) as unknown as RawClaudeResponse;

  const textBlock = response.content.find((c) => c.type === "text");
  return {
    narrative: textBlock?.text ?? "",
    modelUsed: MODEL_NARRATIVE,
  };
}

// ---------- Deprecated stubs (kept for type-level API compat during migration) ----------
// These were the 2.5A fail-loud stubs. Callers should migrate to
// callExtraction / callNarrative. Left in place for one phase to avoid a
// coordinated rename; removed in 2.5C.

export async function extractMarkers(): Promise<never> {
  throw new Error(
    "convex/lib/claude.ts: extractMarkers() is the 2.5A stub. Use callExtraction() instead.",
  );
}

export async function generateNarrative(): Promise<never> {
  throw new Error(
    "convex/lib/claude.ts: generateNarrative() is the 2.5A stub. Use callNarrative() instead.",
  );
}
