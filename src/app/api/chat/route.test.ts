// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readEvents, type ChatStreamEvent } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

const streamChat = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/anthropic", () => ({ streamChat }));

function post(body: unknown, ip = "203.0.113.1"): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = { messages: [{ role: "user", content: "Hallo" }] };

/** The route keeps its rate limiter at module scope, so each test loads a fresh copy. */
async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("CHAT_RATE_LIMIT_PER_MINUTE", "2");
  streamChat.mockReset();
});

describe("POST /api/chat", () => {
  it("streams model events as NDJSON", async () => {
    const events: ChatStreamEvent[] = [
      { type: "text", delta: "Hallo" },
      { type: "text", delta: " Welt" },
      { type: "done", stopReason: "complete" },
    ];
    streamChat.mockImplementation(async function* () {
      yield* events;
    });
    const { POST } = await loadRoute();

    const response = await POST(post(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/x-ndjson");
    const received: ChatStreamEvent[] = [];
    for await (const event of readEvents(response.body!)) received.push(event);
    expect(received).toEqual(events);
    expect(streamChat.mock.calls[0]?.[0]).toEqual<ChatMessage[]>(
      validBody.messages as ChatMessage[],
    );
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["a schema violation", { messages: [{ role: "assistant", content: "Hi" }] }],
  ])("rejects %s with 400 without calling the model", async (_label, body) => {
    const { POST } = await loadRoute();

    const response = await POST(post(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "bad_request" } });
    expect(streamChat).not.toHaveBeenCalled();
  });

  it("returns 503 when no API credentials are configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "");
    const { POST } = await loadRoute();

    const response = await POST(post(validBody));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "not_configured" } });
    expect(streamChat).not.toHaveBeenCalled();
  });

  it("rate-limits per client address", async () => {
    streamChat.mockImplementation(async function* () {});
    const { POST } = await loadRoute();

    expect((await POST(post(validBody))).status).toBe(200);
    expect((await POST(post(validBody))).status).toBe(200);
    const limited = await POST(post(validBody));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);

    expect((await POST(post(validBody, "203.0.113.2"))).status).toBe(200);
  });

  it("aborts the model request when the client cancels the stream", async () => {
    let signal: AbortSignal | undefined;
    streamChat.mockImplementation(async function* (_messages: ChatMessage[], s: AbortSignal) {
      signal = s;
      yield { type: "text", delta: "…" } satisfies ChatStreamEvent;
      await new Promise(() => {});
    });
    const { POST } = await loadRoute();

    const response = await POST(post(validBody));
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();

    expect(signal?.aborted).toBe(true);
  });
});
