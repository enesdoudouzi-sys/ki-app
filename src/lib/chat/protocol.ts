import { z } from "zod";

/**
 * Wire protocol between `/api/chat` and the browser: newline-delimited JSON.
 * One event per line, so the client can parse incrementally while streaming.
 */
export const STREAM_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

export const stopReasonSchema = z.enum(["complete", "max_tokens", "refusal"]);
export type StopReason = z.infer<typeof stopReasonSchema>;

export const errorCodeSchema = z.enum([
  "bad_request",
  "rate_limited",
  "not_configured",
  "upstream_unavailable",
  "internal",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("done"), stopReason: stopReasonSchema }),
  z.object({ type: z.literal("error"), code: errorCodeSchema }),
]);
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

export function encodeEvent(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/** Parses an NDJSON byte stream into events. Chunk boundaries may fall anywhere. */
export async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = done ? "" : (lines.pop() ?? "");

      for (const line of lines) {
        if (line.trim() === "") continue;
        yield chatStreamEventSchema.parse(JSON.parse(line));
      }
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}
