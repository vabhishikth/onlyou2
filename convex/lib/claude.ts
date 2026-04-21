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
import { z } from "zod";

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
// module loaded at cold-start. Each pair is a user-turn (PDF-less simplified
// description of the report) + assistant-turn (the exact JSON shape the
// extractor should emit). Three pairs mirror the golden JSON fixtures under
// `convex/__tests__/biomarker/fixtures/golden/`; five are founder-verified
// synthetic examples covering the major Indian lab formats (SRL lipid,
// Apollo hormonal, Dr Lal HbA1c, Thyrocare vitamin D, Metropolis iron studies).
export const FEW_SHOT_EXAMPLES: Array<{
  role: "user" | "assistant";
  content: string;
}> = [
  // Golden #1 — Dr Lal PathLabs CBC (happy path)
  {
    role: "user",
    content:
      "Lab report (Dr Lal PathLabs) — Patient: TEST PATIENT MALE. Collection: 2026-03-15. Page 1 shows a CBC panel: Hemoglobin 14.2 g/dL (ref 13.5-17.0), Total WBC Count 7500 /cumm (ref 4000-10000), Platelet Count 250000 /cumm (ref 150000-410000), MCV 88 fL (ref 78-98). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "TEST PATIENT MALE",
      collection_date: "2026-03-15",
      markers: [
        {
          name_on_report: "Hemoglobin",
          canonical_id_guess: "hemoglobin",
          raw_value: "14.2",
          raw_unit: "g/dL",
          lab_printed_range: "13.5 - 17.0",
          page_number: 1,
          confidence: 0.97,
        },
        {
          name_on_report: "Total WBC Count",
          canonical_id_guess: "wbc",
          raw_value: "7500",
          raw_unit: "/cumm",
          lab_printed_range: "4000 - 10000",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Platelet Count",
          canonical_id_guess: "platelets",
          raw_value: "250000",
          raw_unit: "/cumm",
          lab_printed_range: "150000 - 410000",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "MCV",
          canonical_id_guess: "mcv",
          raw_value: "88",
          raw_unit: "fL",
          lab_printed_range: "78 - 98",
          page_number: 1,
          confidence: 0.95,
        },
      ],
    }),
  },
  // Golden #2 — Thyrocare thyroid profile
  {
    role: "user",
    content:
      "Lab report (Thyrocare) — Patient: TEST PATIENT FEMALE. Collection: 2026-03-15. Page 1 thyroid profile: TSH (Thyroid Stimulating Hormone) 6.80 mIU/L (ref 0.27-4.20), T3 (Triiodothyronine) 1.12 nmol/L (ref 1.08-3.14), T4 (Thyroxine) 82.5 nmol/L (ref 66.0-181.0), Free T3 (FT3) 4.10 pmol/L (ref 3.10-6.80), Free T4 (FT4) 11.5 pmol/L (ref 12.0-22.0). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "TEST PATIENT FEMALE",
      collection_date: "2026-03-15",
      markers: [
        {
          name_on_report: "TSH (Thyroid Stimulating Hormone)",
          canonical_id_guess: "tsh",
          raw_value: "6.80",
          raw_unit: "mIU/L",
          lab_printed_range: "0.27 - 4.20",
          page_number: 1,
          confidence: 0.97,
        },
        {
          name_on_report: "T3 (Triiodothyronine)",
          canonical_id_guess: "t3_total",
          raw_value: "1.12",
          raw_unit: "nmol/L",
          lab_printed_range: "1.08 - 3.14",
          page_number: 1,
          confidence: 0.94,
        },
        {
          name_on_report: "T4 (Thyroxine)",
          canonical_id_guess: "t4_total",
          raw_value: "82.5",
          raw_unit: "nmol/L",
          lab_printed_range: "66.0 - 181.0",
          page_number: 1,
          confidence: 0.94,
        },
        {
          name_on_report: "Free T3 (FT3)",
          canonical_id_guess: "ft3",
          raw_value: "4.10",
          raw_unit: "pmol/L",
          lab_printed_range: "3.10 - 6.80",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Free T4 (FT4)",
          canonical_id_guess: "ft4",
          raw_value: "11.5",
          raw_unit: "pmol/L",
          lab_printed_range: "12.0 - 22.0",
          page_number: 1,
          confidence: 0.96,
        },
      ],
    }),
  },
  // Golden #3 — Metropolis multipage wellness (trimmed to a representative subset
  // to keep the few-shot token footprint bounded; full panel lives in the golden
  // JSON fixture used by live tests)
  {
    role: "user",
    content:
      "Lab report (Metropolis, multipage wellness) — Patient: TEST PATIENT WELLNESS. Collection: 2026-03-15. Page 1 metabolic + lipid: Fasting Blood Glucose 98 mg/dL (ref 70-100), HbA1c 6.2% (ref <5.7), Total Cholesterol 218 mg/dL (ref <200), HDL 48 mg/dL (ref >40), LDL 142 mg/dL (ref <130), Triglycerides 162 mg/dL (ref <150). Page 2 liver: SGPT (ALT) 52 U/L (ref 7-40). Page 3 vitamins + thyroid: Vitamin D (25-OH) 18.5 ng/mL (ref 30.0-100.0), Vitamin B12 195 pg/mL (ref 211-911), TSH 2.40 mIU/L (ref 0.27-4.20). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "TEST PATIENT WELLNESS",
      collection_date: "2026-03-15",
      markers: [
        {
          name_on_report: "Fasting Blood Glucose",
          canonical_id_guess: "glucose_fasting",
          raw_value: "98",
          raw_unit: "mg/dL",
          lab_printed_range: "70 - 100",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "HbA1c",
          canonical_id_guess: "hba1c",
          raw_value: "6.2",
          raw_unit: "%",
          lab_printed_range: "< 5.7",
          page_number: 1,
          confidence: 0.97,
        },
        {
          name_on_report: "Total Cholesterol",
          canonical_id_guess: "total_cholesterol",
          raw_value: "218",
          raw_unit: "mg/dL",
          lab_printed_range: "< 200",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "HDL Cholesterol",
          canonical_id_guess: "hdl",
          raw_value: "48",
          raw_unit: "mg/dL",
          lab_printed_range: "> 40",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "LDL Cholesterol",
          canonical_id_guess: "ldl",
          raw_value: "142",
          raw_unit: "mg/dL",
          lab_printed_range: "< 130",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Triglycerides",
          canonical_id_guess: "triglycerides",
          raw_value: "162",
          raw_unit: "mg/dL",
          lab_printed_range: "< 150",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "SGPT (ALT)",
          canonical_id_guess: "alt",
          raw_value: "52",
          raw_unit: "U/L",
          lab_printed_range: "7 - 40",
          page_number: 2,
          confidence: 0.95,
        },
        {
          name_on_report: "Vitamin D (25-OH)",
          canonical_id_guess: "vitamin_d",
          raw_value: "18.5",
          raw_unit: "ng/mL",
          lab_printed_range: "30.0 - 100.0",
          page_number: 3,
          confidence: 0.96,
        },
        {
          name_on_report: "Vitamin B12",
          canonical_id_guess: "vitamin_b12",
          raw_value: "195",
          raw_unit: "pg/mL",
          lab_printed_range: "211 - 911",
          page_number: 3,
          confidence: 0.96,
        },
        {
          name_on_report: "TSH",
          canonical_id_guess: "tsh",
          raw_value: "2.40",
          raw_unit: "mIU/L",
          lab_printed_range: "0.27 - 4.20",
          page_number: 3,
          confidence: 0.97,
        },
      ],
    }),
  },
  // Synthetic #4 — SRL lipid panel (founder-verified)
  {
    role: "user",
    content:
      "Lab report (SRL Diagnostics) — Patient: SRL TEST MALE. Collection: 2026-02-20. Page 1 lipid profile: Total Cholesterol 205 mg/dL (ref <200), HDL Cholesterol 42 mg/dL (ref >40), LDL Cholesterol 135 mg/dL (ref <130), Triglycerides 148 mg/dL (ref <150), VLDL 30 mg/dL (ref <30). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "SRL TEST MALE",
      collection_date: "2026-02-20",
      markers: [
        {
          name_on_report: "Total Cholesterol",
          canonical_id_guess: "total_cholesterol",
          raw_value: "205",
          raw_unit: "mg/dL",
          lab_printed_range: "< 200",
          page_number: 1,
          confidence: 0.97,
        },
        {
          name_on_report: "HDL Cholesterol",
          canonical_id_guess: "hdl",
          raw_value: "42",
          raw_unit: "mg/dL",
          lab_printed_range: "> 40",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "LDL Cholesterol",
          canonical_id_guess: "ldl",
          raw_value: "135",
          raw_unit: "mg/dL",
          lab_printed_range: "< 130",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Triglycerides",
          canonical_id_guess: "triglycerides",
          raw_value: "148",
          raw_unit: "mg/dL",
          lab_printed_range: "< 150",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "VLDL",
          canonical_id_guess: "vldl",
          raw_value: "30",
          raw_unit: "mg/dL",
          lab_printed_range: "< 30",
          page_number: 1,
          confidence: 0.93,
        },
      ],
    }),
  },
  // Synthetic #5 — Apollo hormonal (founder-verified)
  {
    role: "user",
    content:
      "Lab report (Apollo Diagnostics) — Patient: APOLLO TEST FEMALE. Collection: 2026-02-18. Page 1 hormonal panel: FSH 6.4 mIU/mL (ref 3.5-12.5), LH 5.2 mIU/mL (ref 2.4-12.6), Prolactin 18.2 ng/mL (ref 4.8-23.3), Estradiol (E2) 82 pg/mL (ref 30-400), Testosterone Total 35 ng/dL (ref 15-70). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "APOLLO TEST FEMALE",
      collection_date: "2026-02-18",
      markers: [
        {
          name_on_report: "FSH",
          canonical_id_guess: "fsh",
          raw_value: "6.4",
          raw_unit: "mIU/mL",
          lab_printed_range: "3.5 - 12.5",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "LH",
          canonical_id_guess: "lh",
          raw_value: "5.2",
          raw_unit: "mIU/mL",
          lab_printed_range: "2.4 - 12.6",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Prolactin",
          canonical_id_guess: "prolactin",
          raw_value: "18.2",
          raw_unit: "ng/mL",
          lab_printed_range: "4.8 - 23.3",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Estradiol (E2)",
          canonical_id_guess: "estradiol",
          raw_value: "82",
          raw_unit: "pg/mL",
          lab_printed_range: "30 - 400",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Testosterone Total",
          canonical_id_guess: "testosterone_total",
          raw_value: "35",
          raw_unit: "ng/dL",
          lab_printed_range: "15 - 70",
          page_number: 1,
          confidence: 0.96,
        },
      ],
    }),
  },
  // Synthetic #6 — Dr Lal HbA1c (founder-verified)
  {
    role: "user",
    content:
      "Lab report (Dr Lal PathLabs) — Patient: LAL TEST MALE. Collection: 2026-01-30. Page 1 glycemic panel: HbA1c 7.2% (ref <5.7), Estimated Average Glucose (eAG) 160 mg/dL (ref <117), Fasting Blood Sugar 132 mg/dL (ref 70-100). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "LAL TEST MALE",
      collection_date: "2026-01-30",
      markers: [
        {
          name_on_report: "HbA1c",
          canonical_id_guess: "hba1c",
          raw_value: "7.2",
          raw_unit: "%",
          lab_printed_range: "< 5.7",
          page_number: 1,
          confidence: 0.97,
        },
        {
          name_on_report: "Estimated Average Glucose (eAG)",
          canonical_id_guess: "eag",
          raw_value: "160",
          raw_unit: "mg/dL",
          lab_printed_range: "< 117",
          page_number: 1,
          confidence: 0.9,
        },
        {
          name_on_report: "Fasting Blood Sugar",
          canonical_id_guess: "glucose_fasting",
          raw_value: "132",
          raw_unit: "mg/dL",
          lab_printed_range: "70 - 100",
          page_number: 1,
          confidence: 0.96,
        },
      ],
    }),
  },
  // Synthetic #7 — Thyrocare vitamin D (founder-verified)
  {
    role: "user",
    content:
      "Lab report (Thyrocare) — Patient: THYROCARE TEST FEMALE. Collection: 2026-02-05. Page 1 vitamin panel: Vitamin D (25-Hydroxy) 14.8 ng/mL (ref 30.0-100.0). The report also contains a qualitative note 'Deficient' which should not be treated as a separate marker. Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "THYROCARE TEST FEMALE",
      collection_date: "2026-02-05",
      markers: [
        {
          name_on_report: "Vitamin D (25-Hydroxy)",
          canonical_id_guess: "vitamin_d",
          raw_value: "14.8",
          raw_unit: "ng/mL",
          lab_printed_range: "30.0 - 100.0",
          page_number: 1,
          confidence: 0.97,
        },
      ],
    }),
  },
  // Synthetic #8 — Metropolis iron studies (founder-verified)
  {
    role: "user",
    content:
      "Lab report (Metropolis Healthcare) — Patient: METRO TEST FEMALE. Collection: 2026-02-12. Page 1 iron studies: Serum Iron 62 µg/dL (ref 60-170), TIBC 385 µg/dL (ref 250-450), Transferrin Saturation 16% (ref 20-50), Ferritin 11 ng/mL (ref 12-300). Extract all biomarkers. Return ONLY the JSON object.",
  },
  {
    role: "assistant",
    content: JSON.stringify({
      is_lab_report: true,
      patient_name_on_report: "METRO TEST FEMALE",
      collection_date: "2026-02-12",
      markers: [
        {
          name_on_report: "Serum Iron",
          canonical_id_guess: "iron_serum",
          raw_value: "62",
          raw_unit: "µg/dL",
          lab_printed_range: "60 - 170",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "TIBC",
          canonical_id_guess: "tibc",
          raw_value: "385",
          raw_unit: "µg/dL",
          lab_printed_range: "250 - 450",
          page_number: 1,
          confidence: 0.96,
        },
        {
          name_on_report: "Transferrin Saturation",
          canonical_id_guess: "transferrin_saturation",
          raw_value: "16",
          raw_unit: "%",
          lab_printed_range: "20 - 50",
          page_number: 1,
          confidence: 0.95,
        },
        {
          name_on_report: "Ferritin",
          canonical_id_guess: "ferritin",
          raw_value: "11",
          raw_unit: "ng/mL",
          lab_printed_range: "12 - 300",
          page_number: 1,
          confidence: 0.97,
        },
      ],
    }),
  },
];

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
        text: ex.content,
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

  const response = (await client.beta.messages.create({
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
    typeof client.beta.messages.create
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

// ---------- Auto-DRAFT range generation ----------
//
// Secondary Claude call for markers that (a) never classified against the
// reference DB, (b) didn't match any alias fuzzily, and (c) have accumulated
// enough occurrences in the curation queue to justify paying for a second
// call. Output is persisted as a DRAFT reference_range (clinicalReviewer =
// "DRAFT — auto-generated YYYY-MM-DD") which a human reviews before the
// range is trusted for production decisions.
//
// Gating is handled by convex/biomarker/lib/autoDraftRange.ts.

export const AutoDraftRangeOutputSchema = z.object({
  is_real_biomarker: z.boolean(),
  canonical_id: z.string().nullable(),
  display_name: z.string().nullable(),
  aliases: z.array(z.string()),
  category: z.string().nullable(),
  canonical_unit: z.string().nullable(),
  sex: z.enum(["male", "female", "any"]).nullable(),
  age_min: z.number().nullable(),
  age_max: z.number().nullable(),
  pregnancy_sensitive: z.boolean().nullable(),
  optimal_min: z.number().nullable(),
  optimal_max: z.number().nullable(),
  sub_optimal_below_min: z.number().nullable(),
  sub_optimal_above_max: z.number().nullable(),
  action_below: z.number().nullable(),
  action_above: z.number().nullable(),
  explainer: z.string().nullable(),
  source_citation: z.string().nullable(),
  confidence: z.number(),
});
export type AutoDraftRangeOutput = z.infer<typeof AutoDraftRangeOutputSchema>;

export const ALLOWED_CATEGORIES = [
  "Nutrient Health",
  "Thyroid",
  "Metabolic",
  "CBC",
  "Hormonal Balance",
  "Lipids",
  "Liver",
  "Kidney",
] as const;

const AUTO_DRAFT_SYSTEM_PROMPT = `You are a clinical biomarker taxonomy assistant. Given a single marker extracted from a patient's lab report (name, raw unit, lab-printed reference range, and an optional canonical ID guess), decide whether this is a real biomarker in one of the allowed categories. If yes, propose DRAFT reference ranges for Indian adult patients based on standard medical references.

IMPORTANT: return is_real_biomarker=false for:
- Lab panel codes (e.g., "HEM-401", "CBC/PLT-RATIO")
- Derivations or computed ratios (e.g., "LDL/HDL Ratio")
- Lab-specific internal codes
- Anything outside the allowed categories

Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}

For real biomarkers, provide clinically reasonable DRAFT thresholds. Always cite a standard reference (Endocrine Society, NIH, WHO, IOM, etc.). Threshold ordering MUST satisfy: actionBelow < subOptimalBelowMin < optimalMin <= optimalMax < subOptimalAboveMax < actionAbove (for bounds you provide; omit with null if not applicable).

Your output will be reviewed by a clinician before reaching patients.`;

export async function callAutoDraftRange(args: {
  nameOnReport: string;
  rawUnit: string | null;
  labPrintedRange: string | null;
  canonicalIdGuess: string | null;
}): Promise<AutoDraftRangeOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const userMessage = JSON.stringify({
    name_on_report: args.nameOnReport,
    raw_unit: args.rawUnit,
    lab_printed_range: args.labPrintedRange,
    canonical_id_guess: args.canonicalIdGuess,
    categories_allowed: ALLOWED_CATEGORIES,
  });
  const response = (await client.messages.create({
    model: MODEL_NARRATIVE,
    max_tokens: 1200,
    temperature: 0.2,
    system: AUTO_DRAFT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  } as unknown as Parameters<
    typeof client.messages.create
  >[0])) as unknown as RawClaudeResponse;
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0) {
    throw new Error("auto_draft_no_json_in_response");
  }
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  return AutoDraftRangeOutputSchema.parse(parsed);
}
