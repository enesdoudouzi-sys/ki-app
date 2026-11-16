// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatStreamEvent } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

const generateContentStream = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = { generateContentStream };
  },
}));

import { ApiError, FinishReason } from "@google/genai";

import { streamGemini } from "./gemini";

const options = { model: "test-model", maxOutputTokens: 100 };
const conversation: ChatMessage[] = [
  { role: "user", content: "Hallo" },
  { role: "assistant", content: "Hi" },
  { role: "user", content: "Wie geht's?" },
];

function chunks(...items: object[]) {
  return (async function* () {
    yield* items;
  })();
}

async function run(signal = new AbortController().signal): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamGemini(conversation, signal, options)) events.push(event);
  return events;
}

beforeEach(() => {
  generateContentStream.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("streamGemini", () => {
  it("streams text and maps the conversation to Gemini's roles", async () => {
    generateContentStream.mockResolvedValue(
      chunks(
        { text: "Gut, " },
        { text: "danke!", candidates: [{ finishReason: FinishReason.STOP }] },
      ),
    );

    expect(await run()).toEqual([
      { type: "text", delta: "Gut, " },
      { type: "text", delta: "danke!" },
      { type: "done", stopReason: "complete" },
    ]);

    const request = generateContentStream.mock.calls[0]?.[0];
    expect(request.model).toBe("test-model");
    expect(request.config.maxOutputTokens).toBe(100);
    expect(request.contents).toEqual([
      { role: "user", parts: [{ text: "Hallo" }] },
      { role: "model", parts: [{ text: "Hi" }] },
      { role: "user", parts: [{ text: "Wie geht's?" }] },
    ]);
  });

  it.each([
    [FinishReason.MAX_TOKENS, "max_tokens"],
    [FinishReason.SAFETY, "refusal"],
    [FinishReason.PROHIBITED_CONTENT, "refusal"],
  ])("maps finish reason %s to %s", async (finishReason, stopReason) => {
    generateContentStream.mockResolvedValue(chunks({ text: "x", candidates: [{ finishReason }] }));

    expect((await run()).at(-1)).toEqual({ type: "done", stopReason });
  });

  it("reports a blocked prompt as a refusal", async () => {
    generateContentStream.mockResolvedValue(chunks({ promptFeedback: { blockReason: "SAFETY" } }));

    expect(await run()).toEqual([{ type: "done", stopReason: "refusal" }]);
  });

  it.each([
    [429, "quota exceeded", "rate_limited"],
    [403, "permission denied", "not_configured"],
    [400, "API key not valid. Please pass a valid API key.", "not_configured"],
    [400, "request too large", "bad_request"],
    [503, "overloaded", "upstream_unavailable"],
  ])("maps a %i error (%s) to %s", async (status, message, code) => {
    generateContentStream.mockRejectedValue(new ApiError({ status, message }));

    expect(await run()).toEqual([{ type: "error", code }]);
  });

  it("reports a failure in the middle of the stream after the text already sent", async () => {
    generateContentStream.mockResolvedValue(
      (async function* () {
        yield { text: "Teil" };
        throw new Error("connection reset");
      })(),
    );

    expect(await run()).toEqual([
      { type: "text", delta: "Teil" },
      { type: "error", code: "internal" },
    ]);
  });

  it("ends silently when the request was aborted", async () => {
    const abort = new AbortController();
    abort.abort();
    generateContentStream.mockRejectedValue(new Error("aborted"));

    expect(await run(abort.signal)).toEqual([]);
  });
});
