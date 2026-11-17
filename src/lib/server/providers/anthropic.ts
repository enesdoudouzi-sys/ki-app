import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { ErrorCode, StopReason } from "@/lib/chat/protocol";

import { buildSystemPrompt, type ChatProvider } from "./types";

/** Models that accept the server-side refusal fallback parameter. */
const FALLBACK_CAPABLE_MODELS = new Set([
  "claude-fable-5-2",
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

let client: Anthropic | undefined;

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

export const streamAnthropic: ChatProvider = async function* (messages, signal, options) {
  try {
    client ??= new Anthropic();
    const stream = client.beta.messages.stream(
      {
        model: options.model,
        max_tokens: options.maxOutputTokens,
        system: buildSystemPrompt(options.context),
        // Caches the growing conversation prefix between turns.
        cache_control: { type: "ephemeral" },
        messages,
        // If a safety classifier declines the request, the API retries it on a
        // fallback model within the same call.
        ...(FALLBACK_CAPABLE_MODELS.has(options.model)
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
    console.error("[chat] Anthropic request failed", error);
    yield { type: "error", code: toErrorCode(error) };
  }
};
