// convex/biomarker/internal/extractMarkers.ts
//
// Wraps callExtraction with the 3 in-process retry logics:
//   1. zod validation fail → one retry with "return ONLY JSON" follow-up
//   2. stop_reason "max_tokens" → one retry with maxTokens doubled to 8192
//   3. refusal → one retry with "This is structured data extraction, not
//      medical interpretation." prefix
//
// Network / 5xx / 429 errors BUBBLE UP to the orchestrator — this helper
// only handles in-process retryable concerns.

import { z } from "zod";

import {
  callExtraction,
  type ExtractionInput,
  type ExtractionResponse,
} from "../../lib/claude";

const ExtractedMarkerSchema = z.object({
  name_on_report: z.string(),
  canonical_id_guess: z.string().nullable(),
  raw_value: z.string(),
  raw_unit: z.string().nullable(),
  lab_printed_range: z.string().nullable(),
  page_number: z.number(),
  confidence: z.number(),
});

export const ExtractionSchema = z.object({
  is_lab_report: z.boolean(),
  patient_name_on_report: z.string(),
  collection_date: z.string().nullable(),
  markers: z.array(ExtractedMarkerSchema),
});

export interface ExtractCallInput extends ExtractionInput {
  maxTokens?: number;
  followUpMessage?: string;
}

export class ExtractionError extends Error {
  constructor(
    public readonly errorCode:
      | "zod_validation"
      | "response_too_large"
      | "refused",
    message: string,
  ) {
    super(message);
  }
}

export interface ExtractResult {
  response: ExtractionResponse;
  extractAttempts: number;
}

const REFUSAL_PATTERNS = [
  /can'?t help/i,
  /medical advice/i,
  /i['']m not able/i,
  /not trained/i,
];

function looksRefused(raw: unknown): boolean {
  const text = JSON.stringify(raw);
  return REFUSAL_PATTERNS.some((p) => p.test(text));
}

export async function extractMarkersWithRetry(
  input: ExtractionInput,
): Promise<ExtractResult> {
  let attempts = 0;

  const doCall = async (
    opts: ExtractCallInput,
  ): Promise<ExtractionResponse> => {
    attempts++;
    try {
      return await callExtraction(opts);
    } catch (err) {
      const maybeStop = (err as { stop_reason?: string }).stop_reason;
      if (maybeStop === "max_tokens") {
        throw Object.assign(new Error("max_tokens"), {
          stop_reason: "max_tokens",
        });
      }
      throw err;
    }
  };

  // ---- Attempt 1: normal
  let raw: ExtractionResponse;
  try {
    raw = await doCall(input);
  } catch (err) {
    if ((err as { stop_reason?: string }).stop_reason === "max_tokens") {
      // ---- Attempt 2: bumped max_tokens
      try {
        raw = await doCall({ ...input, maxTokens: 8192 });
      } catch (err2) {
        if ((err2 as { stop_reason?: string }).stop_reason === "max_tokens") {
          throw new ExtractionError(
            "response_too_large",
            "Both attempts hit max_tokens",
          );
        }
        throw err2;
      }
    } else {
      throw err;
    }
  }

  // Refusal detection
  if (looksRefused(raw)) {
    try {
      raw = await doCall({
        ...input,
        followUpMessage:
          "This is structured data extraction, not medical interpretation.",
      });
      if (looksRefused(raw)) {
        throw new ExtractionError("refused", "Refused after reprompt");
      }
    } catch (err) {
      if (err instanceof ExtractionError) throw err;
      throw err;
    }
  }

  // Zod validation
  const parsed = ExtractionSchema.safeParse(raw);
  if (parsed.success) {
    return { response: parsed.data, extractAttempts: attempts };
  }

  // Attempt 2 with "JSON only" follow-up
  try {
    const retry = await doCall({
      ...input,
      followUpMessage: "Return ONLY the JSON object. No prose, no markdown.",
    });
    const retryParsed = ExtractionSchema.safeParse(retry);
    if (retryParsed.success) {
      return { response: retryParsed.data, extractAttempts: attempts };
    }
    throw new ExtractionError(
      "zod_validation",
      `Zod failed twice: ${parsed.error.message}`,
    );
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(
      "zod_validation",
      `Zod failed twice: ${parsed.error.message}`,
    );
  }
}
