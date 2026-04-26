import { z } from "zod";

export const PROMPT_VERSION_HAIR_LOSS = "hair-loss-v1" as const;

export const STAGE_SCALES = ["norwood", "ludwig", "unclassified"] as const;
export type StageScale = (typeof STAGE_SCALES)[number];

// Hair-loss MVP vocabulary. Sourced from docs/VERTICAL-HAIR-LOSS.md "AI use" notes.
// Order is documentation-aligned, not prioritized — severity is encoded in the
// emitted flag entries by the model, not in the code list.
export const FLAG_CODES = [
  "FINASTERIDE_CAUTION_UNDER_25",
  "FINASTERIDE_CONTRAINDICATED_FEMALE_CHILDBEARING",
  "SCARRING_ALOPECIA_SUSPECT",
  "ALOPECIA_AREATA_SUSPECT",
  "TELOGEN_EFFLUVIUM_TRIGGER_PRESENT",
  "THYROID_HISTORY_LAB_PRIORITY",
  "ANEMIA_SUSPECT_LAB_PRIORITY",
  "PCOS_HORMONAL_PATHWAY",
  "DRUG_INTERACTION_REVIEW",
  "PRE_EXISTING_SEXUAL_DYSFUNCTION",
  "NON_SCALP_HAIR_LOSS",
  "INSUFFICIENT_DATA",
] as const;
export type FlagCode = (typeof FLAG_CODES)[number];

export const SEVERITIES = ["info", "caution", "red_flag"] as const;
export type Severity = (typeof SEVERITIES)[number];

const flagSchema = z.object({
  code: z.enum(FLAG_CODES),
  severity: z.enum(SEVERITIES),
  message: z.string().min(1).max(500),
});

const stageSchema = z.object({
  scale: z.enum(STAGE_SCALES),
  value: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
});

export const aiAssessmentResponseSchema = z.object({
  narrative: z.string().min(20).max(2000),
  stage: stageSchema,
  flags: z.array(flagSchema).max(20),
  confidence: z.number().min(0).max(1),
});

export type AiAssessmentResponse = z.infer<typeof aiAssessmentResponseSchema>;
