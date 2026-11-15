import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { ChatStreamEvent, ErrorCode, StopReason } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

import { getServerConfig } from "./config";

const SYSTEM_PROMPT = [
  "You are a helpful assistant in a web chat application.",
  "Reply in the language the user writes in.",
  "The interface renders Markdown, so use it where it helps readability, including fenced code blocks with a language tag for code.",
].join(" ");

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function toStopReason(stopReason: string | null): StopReason {
  if (stopReason === "max_tokens") return "max_tokens";
  if (stopReason === "refusal") return "refusal";
  return "complete";
}

function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof Anthropic.AuthenticationError) return "not_configured";
  if (error instanceof Anthropic.PermissionDeniedError) return "not_configured";
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.BadRequestError) return "bad_request";
  if (error instanceof Anthropic.APIConnectionError) return "upstream_unavailable";
  if (error instanceof Anthropic.APIError && (error.status ?? 500) >= 500) {
    return "upstream_unavailable";
  }
  return "internal";
}

/**
 * Streams a model reply as protocol events. Never throws: failures become an
 * `error` event so the HTTP stream can always be closed cleanly. Upstream error
 * details are logged server-side and not forwarded to the browser.
 */
export async function* streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const config = getServerConfig();

  try {
    const stream = getClient().beta.messages.stream(
      {
        model: config.model,
        max_tokens: config.maxOutputTokens,
        system: SYSTEM_PROMPT,
        // Caches the growing conversation prefix between turns.
        cache_control: { type: "ephemeral" },
        messages,
        // If a safety classifier declines the request, the API retries it on a
        // fallback model within the same call.
        ...(config.supportsFallbacks
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", delta: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield { type: "done", stopReason: toStopReason(finalMessage.stop_reason) };
  } catch (error) {
    if (signal.aborted || error instanceof Anthropic.APIUserAbortError) return;
    console.error("[chat] upstream request failed", error);
    yield { type: "error", code: toErrorCode(error) };
  }
}
