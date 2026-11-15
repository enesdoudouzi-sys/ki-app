import { encodeEvent, type ChatStreamEvent } from "@/lib/chat/protocol";

/** Builds a byte stream from raw string chunks, to simulate arbitrary network chunking. */
export function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

export function streamFromEvents(events: ChatStreamEvent[]): ReadableStream<Uint8Array> {
  return streamFromChunks(events.map(encodeEvent));
}
