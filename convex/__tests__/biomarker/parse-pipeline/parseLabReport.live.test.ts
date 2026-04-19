// convex/__tests__/biomarker/parse-pipeline/parseLabReport.live.test.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, it, expect, beforeAll } from "vitest";

import {
  ExtractionSchema,
  extractMarkersWithRetry,
} from "../../../biomarker/internal/extractMarkers";

const FIXTURES = [
  {
    file: "01-lal-pathlabs-cbc-happy.pdf",
    expectIsLabReport: true,
    minMarkers: 4,
  },
  {
    file: "02-thyrocare-thyroid-profile.pdf",
    expectIsLabReport: true,
    minMarkers: 3,
  },
  {
    file: "03-metropolis-multipage-wellness.pdf",
    expectIsLabReport: true,
    minMarkers: 35,
  },
  {
    file: "04-serology-qualitative.pdf",
    expectIsLabReport: true,
    minMarkers: 3,
  },
  { file: "05-urinalysis-graded.pdf", expectIsLabReport: true, minMarkers: 4 },
  {
    file: "06-handwritten-stamp-overlay.pdf",
    expectIsLabReport: true,
    minMarkers: 3,
  },
  {
    file: "07-prescription-not-lab-report.pdf",
    expectIsLabReport: false,
    minMarkers: 0,
  },
  { file: "08-name-mismatch.pdf", expectIsLabReport: true, minMarkers: 3 },
];

describe("parseLabReport — live Anthropic API (8 synthetic fixtures)", () => {
  beforeAll(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY not set; skipping live tests. Set it to run pnpm test:claude.",
      );
    }
  });

  for (const fix of FIXTURES) {
    it(`extracts ${fix.file}`, async () => {
      const pdfBase64 = (
        await readFile(join(__dirname, "../fixtures/lab-reports", fix.file))
      ).toString("base64");
      const { response } = await extractMarkersWithRetry({
        pdfBase64,
        pdfMimeType: "application/pdf",
      });
      // Zod round-trip via schema
      const parsed = ExtractionSchema.parse(response);
      expect(parsed.is_lab_report).toBe(fix.expectIsLabReport);
      expect(parsed.markers.length).toBeGreaterThanOrEqual(fix.minMarkers);
    });
  }
});
