// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatStreamEvent } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

const streamGemini = vi.hoisted(() => vi.fn());
vi.mock("./providers/gemini", () => ({ streamGemini }));
vi.mock("./providers/anthropic", () => ({ streamAnthropic: vi.fn() }));

import { streamChat } from "./model";

const question: ChatMessage[] = [{ role: "user", content: "Was bedeutet DAP bei den Incoterms?" }];

async function collect(): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of streamChat(question, new AbortController().signal)) events.push(event);
  return events;
}

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("RAG_ENABLED", "");
  vi.stubEnv("RAG_SOURCE_DIR", "src/lib/rag/fixtures");
  streamGemini.mockReset().mockImplementation(async function* () {
    yield { type: "text", delta: "Antwort" } satisfies ChatStreamEvent;
  });
});

describe("streamChat", () => {
  it("sucht nichts und sendet keine Quellen, wenn die Wissenssuche aus ist", async () => {
    const events = await collect();

    expect(events).toEqual([{ type: "text", delta: "Antwort" }]);
    expect(streamGemini.mock.calls[0]?.[2].context).toBeUndefined();
  });

  it("sendet die Quellen zuerst und gibt die Auszüge an das Modell weiter", async () => {
    vi.stubEnv("RAG_ENABLED", "true");

    const events = await collect();

    expect(events[0]?.type).toBe("sources");
    expect(events[1]).toEqual({ type: "text", delta: "Antwort" });
    expect(streamGemini.mock.calls[0]?.[2].context).toContain("[1]");
  });

  it("antwortet auch ohne Treffer, nur ohne Quellen", async () => {
    vi.stubEnv("RAG_ENABLED", "true");
    streamGemini.mockClear();
    const events: ChatStreamEvent[] = [];
    for await (const event of streamChat(
      [{ role: "user", content: "Schokoladenkuchen" }],
      new AbortController().signal,
    )) {
      events.push(event);
    }

    expect(events).toEqual([{ type: "text", delta: "Antwort" }]);
    expect(streamGemini.mock.calls[0]?.[2].context).toBeUndefined();
  });
});
