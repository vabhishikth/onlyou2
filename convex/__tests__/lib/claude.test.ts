import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  MODEL_EXTRACTION,
  MODEL_NARRATIVE,
  callExtraction,
  callNarrative,
  type ExtractionInput,
  type NarrativeInput,
} from "../../lib/claude";

// Mock the Anthropic SDK
// callExtraction uses client.beta.messages.create (for the `betas` body param);
// callNarrative uses client.messages.create. Both surfaces are mocked to the
// same vi.fn so assertions in either path work against __createMock.
vi.mock("@anthropic-ai/sdk", () => {
  const createMock = vi.fn();
  function AnthropicMock(this: {
    messages: { create: ReturnType<typeof vi.fn> };
    beta: { messages: { create: ReturnType<typeof vi.fn> } };
  }) {
    this.messages = { create: createMock };
    this.beta = { messages: { create: createMock } };
  }
  return {
    default: AnthropicMock,
    __createMock: createMock,
  };
});

const { __createMock } = (await import("@anthropic-ai/sdk")) as unknown as {
  __createMock: ReturnType<typeof vi.fn>;
};

describe("convex/lib/claude", () => {
  beforeEach(() => {
    __createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("exports stable MODEL_EXTRACTION and MODEL_NARRATIVE constants", () => {
    expect(MODEL_EXTRACTION).toMatch(/^claude-/);
    expect(MODEL_NARRATIVE).toMatch(/^claude-/);
  });

  it("callExtraction sends vision content block + cache_control breakpoint", async () => {
    __createMock.mockResolvedValueOnce({
      id: "msg_test",
      content: [
        {
          type: "text",
          text: '{"is_lab_report":true,"markers":[],"patient_name_on_report":"","collection_date":null}',
        },
      ],
      stop_reason: "end_turn",
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 100,
      },
    });
    const input: ExtractionInput = {
      pdfBase64: "JVBERi0xLjQKJfbk/N8...",
      pdfMimeType: "application/pdf",
    };
    const result = await callExtraction(input);
    expect(__createMock).toHaveBeenCalledOnce();
    const callArg = __createMock.mock.calls[0][0];
    expect(callArg.model).toBe(MODEL_EXTRACTION);
    // One breakpoint — on the system block (stable prefix, always present)
    const cachedBlocks = callArg.system
      ? (Array.isArray(callArg.system) ? callArg.system : []).filter(
          (c: { cache_control?: unknown }) => c.cache_control,
        )
      : [];
    expect(cachedBlocks.length).toBe(1);
    // PDF comes AFTER the cache breakpoint
    const lastBlock =
      callArg.messages[callArg.messages.length - 1].content.at(-1);
    expect(lastBlock.type).toBe("document");
    expect(lastBlock.source.media_type).toBe("application/pdf");
    expect(result.is_lab_report).toBe(true);
  });

  it("callNarrative sends a short-form prompt, no caching", async () => {
    __createMock.mockResolvedValueOnce({
      id: "msg_test",
      content: [
        {
          type: "text",
          text: "Your thyroid markers look optimal. Vitamin D is mildly low.",
        },
      ],
      stop_reason: "end_turn",
      usage: { input_tokens: 40, output_tokens: 20 },
    });
    const input: NarrativeInput = {
      classifiedMarkers: [{ name: "TSH", status: "optimal", value: 2.1 }],
    };
    const result = await callNarrative(input);
    expect(result.narrative).toMatch(/thyroid/i);
  });

  it("callExtraction passes extended-cache-ttl beta header", async () => {
    __createMock.mockResolvedValueOnce({
      id: "msg_test",
      content: [
        {
          type: "text",
          text: '{"is_lab_report":true,"markers":[],"patient_name_on_report":"","collection_date":null}',
        },
      ],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    await callExtraction({ pdfBase64: "x", pdfMimeType: "application/pdf" });
    const call = __createMock.mock.calls[0][0];
    expect(call.betas).toContain("extended-cache-ttl-2025-04-11");
  });
});
