---
date: "2026-04-17"
phase: 2.5
status: decision
tags:
  - architecture
  - phase-2.5
  - biomarker
  - ai
---

# Decision — Claude vision-native lab report parsing

**Date:** 2026-04-17
**Phase:** 2.5 brainstorm
**Spec reference:** [[superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design|Phase 2.5 design spec]] §3.4, §3.8

## Decision

Lab reports (PDF + image uploads) are parsed in a single call to the Anthropic Claude API using a **vision-native document content block**. No separate OCR step. No third-party OCR vendor. Claude extracts every biomarker visible in the report and returns a strict JSON schema with `name_on_report`, `canonical_id_guess`, `raw_value`, `raw_unit`, `lab_printed_range`, `page_number`, and `confidence` per marker, plus `patient_name_on_report`, `collection_date`, and `is_lab_report`.

A second Claude call generates the 2–3 sentence narrative from the classified output (no numerics, no medical advice, referential only to markers present).

## Why (over alternatives)

### A — Claude vision-native (chosen)

- One API call per parse (extraction). No pipeline to debug.
- Handles tables, multi-column layouts, mixed scripts, qualitative values natively.
- Already in the stack per [[CLAUDE]] (`docs/CLAUDE.md`).
- Per-parse cost with prompt caching on system + few-shot: ~₹1.20.

### B — Text-layer first + Tesseract fallback + Claude structuring

- Cheaper per parse on native-text PDFs.
- But: two new deps (`pdf-parse`, Tesseract), worse table accuracy, two failure paths to maintain, no improvement on scanned-image input. Rejected.

### C — Google Cloud Vision / AWS Textract + Claude

- Best accuracy on poor scans.
- But: new vendor + PII in transit to third party + compliance review + extra cost. Rejected for 2.5. Keep available as a future layer if accuracy becomes a production problem.

## Operational rules

1. **Model IDs centralized.** `convex/lib/claude.ts` exports `MODEL_EXTRACTION` and `MODEL_NARRATIVE`. Verified against Anthropic's current docs at implementation time (Context7 / web fetch), never hard-coded from training data or session memory. Model bump = one-line change.
2. **No Opus escalation path in 2.5.** Retries stay on Sonnet with a "fix the JSON" follow-up. Opus is ~5x Sonnet input; transient failures should not 5x the bill. If a specific Sonnet-unrecoverable failure class emerges, revisit with budget approval.
3. **Prompt caching.** System prompt + few-shot examples are separately cached (Anthropic `cache_control: { type: "ephemeral" }`). Per-parse marginal cost after first hit drops ~80%.
4. **Schema validation + one retry.** Zod validation on extraction response. On fail, one retry with follow-up user message: "Return ONLY the JSON object. No prose, no markdown." Persistent fail → `parse_failed`.
5. **Hallucination mitigation.** Prompt demands page-number citation per marker, explicit "never hallucinate; if unsure, omit" instruction, and extractions must be auditable against the source PDF. Unknown markers flow into the curation queue and surface as `unclassified` in the UI — we degrade gracefully rather than claiming coverage we don't have.
6. **Telemetry never logs PDF content or extracted values.** Only `labReportId`, hashed `userId`, status transitions, marker counts, durations.

## How to apply

- Every future AI integration in the project checks this decision before adding a new model vendor. First question: "can Claude handle this?"
- Model-ID constants must live in the single file (`convex/lib/claude.ts`). Scattering model IDs across call sites is the pattern that causes silent version drift.
- When Anthropic ships a new vision-capable model, update the two constants, verify against the extraction test suite + the Claude integration suite (`pnpm test:claude`), then roll out.
- Cost watcher: `biomarker_parsing_enabled` feature flag stays wired. If the monthly bill spikes unexpectedly, flip the flag to queue uploads without charging.

## Risks

- **Prompt drift.** The extraction prompt is load-bearing. Every edit runs the integration suite before merge.
- **Model behavioral change on version bump.** Few-shot examples stabilize behavior, but a major model version change can still shift outputs. The seeder-guarded reference-range DB and unclassified fallback provide defense in depth — if the model suddenly emits worse marker names, the curation queue surfaces the drift as a queue spike.
