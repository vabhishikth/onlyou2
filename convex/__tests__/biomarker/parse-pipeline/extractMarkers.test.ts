import { describe, it, expect, vi, beforeEach } from "vitest";

import { extractMarkersWithRetry } from "../../../biomarker/internal/extractMarkers";

const mockCall = vi.fn();
vi.mock("../../../lib/claude", async () => {
  const actual = (await vi.importActual("../../../lib/claude")) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    callExtraction: (...args: unknown[]) => mockCall(...args),
  };
});

const validResponse = {
  is_lab_report: true,
  patient_name_on_report: "TEST",
  collection_date: "2026-03-15",
  markers: [
    {
      name_on_report: "Hemoglobin",
      canonical_id_guess: "hemoglobin",
      raw_value: "14.2",
      raw_unit: "g/dL",
      lab_printed_range: "13.5-17.0",
      page_number: 1,
      confidence: 0.98,
    },
  ],
};

describe("extractMarkersWithRetry", () => {
  beforeEach(() => mockCall.mockReset());

  it("returns parsed response on first success", async () => {
    mockCall.mockResolvedValueOnce(validResponse);
    const result = await extractMarkersWithRetry({
      pdfBase64: "xxx",
      pdfMimeType: "application/pdf",
    });
    expect(result.response).toEqual(validResponse);
    expect(result.extractAttempts).toBe(1);
  });

  it("retries once on zod failure with JSON-only follow-up", async () => {
    mockCall.mockResolvedValueOnce({ garbage: true });
    mockCall.mockResolvedValueOnce(validResponse);
    const result = await extractMarkersWithRetry({
      pdfBase64: "xxx",
      pdfMimeType: "application/pdf",
    });
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(result.extractAttempts).toBe(2);
  });

  it("throws terminal zod_validation after both attempts fail", async () => {
    mockCall.mockResolvedValueOnce({ garbage: true });
    mockCall.mockResolvedValueOnce({ also: "bad" });
    await expect(
      extractMarkersWithRetry({
        pdfBase64: "xxx",
        pdfMimeType: "application/pdf",
      }),
    ).rejects.toMatchObject({ errorCode: "zod_validation" });
  });

  it("retries once on max_tokens with bumped limit", async () => {
    const err1 = Object.assign(new Error("max_tokens"), {
      stop_reason: "max_tokens",
    });
    mockCall.mockRejectedValueOnce(err1);
    mockCall.mockResolvedValueOnce(validResponse);
    const result = await extractMarkersWithRetry({
      pdfBase64: "xxx",
      pdfMimeType: "application/pdf",
    });
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall.mock.calls[1][0].maxTokens).toBe(8192);
    expect(result.response).toEqual(validResponse);
  });

  it("throws response_too_large after two max_tokens hits", async () => {
    const err = Object.assign(new Error("max_tokens"), {
      stop_reason: "max_tokens",
    });
    mockCall.mockRejectedValueOnce(err);
    mockCall.mockRejectedValueOnce(err);
    await expect(
      extractMarkersWithRetry({
        pdfBase64: "xxx",
        pdfMimeType: "application/pdf",
      }),
    ).rejects.toMatchObject({ errorCode: "response_too_large" });
  });

  it("reprompts once on refusal, then terminal", async () => {
    mockCall.mockResolvedValueOnce({
      refusalLike: "I can't help with medical advice",
    });
    mockCall.mockResolvedValueOnce(validResponse);
    const result = await extractMarkersWithRetry({
      pdfBase64: "xxx",
      pdfMimeType: "application/pdf",
    });
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(result.extractAttempts).toBe(2);
  });

  // I-2 fix: valid-shape responses must NOT trigger refusal detection even
  // when clinical text in their fields matches a refusal pattern.
  it("valid-shape response with 'medical advice' in lab_printed_range is NOT a refusal (I-2 fix)", async () => {
    const responseWithClinicalText = {
      is_lab_report: true,
      patient_name_on_report: "Test Patient",
      collection_date: "2026-03-15",
      markers: [
        {
          name_on_report: "Glucose",
          canonical_id_guess: "glucose",
          raw_value: "95",
          raw_unit: "mg/dL",
          // lab footer text that used to trigger looksRefused()
          lab_printed_range: "Consult physician for medical advice: 70-99",
          page_number: 1,
          confidence: 0.95,
        },
      ],
    };
    mockCall.mockResolvedValueOnce(responseWithClinicalText);
    const result = await extractMarkersWithRetry({
      pdfBase64: "xxx",
      pdfMimeType: "application/pdf",
    });
    // Must succeed in a single call — no refusal reprompt fired
    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(result.response.markers[0]?.lab_printed_range).toContain(
      "medical advice",
    );
  });

  it("plain string refusal is still detected", async () => {
    mockCall.mockResolvedValueOnce(
      "I can't help with medical advice requests.",
    );
    mockCall.mockResolvedValueOnce(validResponse);
    const result = await extractMarkersWithRetry({
      pdfBase64: "xxx",
      pdfMimeType: "application/pdf",
    });
    // Reprompt fired because the response was a plain string, not JSON
    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(result.extractAttempts).toBe(2);
  });
});
