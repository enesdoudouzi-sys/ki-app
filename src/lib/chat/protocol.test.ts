import { describe, expect, it } from "vitest";

import { streamFromChunks } from "@/test/streams";

import { encodeEvent, readEvents, type ChatStreamEvent } from "./protocol";

async function collect(stream: ReadableStream<Uint8Array>): Promise<ChatStreamEvent[]> {
  const events: ChatStreamEvent[] = [];
  for await (const event of readEvents(stream)) events.push(event);
  return events;
}

const events: ChatStreamEvent[] = [
  { type: "text", delta: "Hallo " },
  { type: "text", delta: "Wélt 🌍\nZeile 2" },
  { type: "done", stopReason: "complete" },
];

describe("readEvents", () => {
  it("round-trips encoded events", async () => {
    expect(await collect(streamFromChunks(events.map(encodeEvent)))).toEqual(events);
  });

  it("handles events split across chunk boundaries, including inside multi-byte characters", async () => {
    const bytes = new TextEncoder().encode(events.map(encodeEvent).join(""));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3));
        controller.close();
      },
    });
    expect(await collect(stream)).toEqual(events);
  });

  it("parses a final event without a trailing newline", async () => {
    const stream = streamFromChunks(['{"type":"done","stopReason":"refusal"}']);
    expect(await collect(stream)).toEqual([{ type: "done", stopReason: "refusal" }]);
  });

  it("throws on events that do not match the protocol", async () => {
    await expect(collect(streamFromChunks(['{"type":"nope"}\n']))).rejects.toThrow();
  });
});
