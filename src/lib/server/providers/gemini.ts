import "server-only";

import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";

import type { ErrorCode, StopReason } from "@/lib/chat/protocol";

import { buildSystemPrompt, type ChatProvider } from "./types";

const BLOCKED_FINISH_REASONS = new Set<FinishReason>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

let client: GoogleGenAI | undefined;

function toStopReason(finishReason: FinishReason | undefined, promptBlocked: boolean): StopReason {
  if (promptBlocked) return "refusal";
  if (finishReason === FinishReason.MAX_TOKENS) return "max_tokens";
  if (finishReason && BLOCKED_FINISH_REASONS.has(finishReason)) return "refusal";
  return "complete";
}

function toErrorCode(error: unknown): ErrorCode {
  if (!(error instanceof ApiError)) return "internal";
  if (error.status === 401 || error.status === 403) return "not_configured";
  if (error.status === 429) return "rate_limited";
  if (error.status === 400) {
    // The API reports an invalid key as a generic 400; tell it apart so the
    // user sees a configuration hint instead of "shorten your message".
    return /api key/i.test(error.message) ? "not_configured" : "bad_request";
  }
  if (error.status >= 500) return "upstream_unavailable";
  return "internal";
}

export const streamGemini: ChatProvider = async function* (messages, signal, options) {
  try {
    client ??= new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    });

    const stream = await client.models.generateContentStream({
      model: options.model,
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: {
        systemInstruction: buildSystemPrompt(options.context),
        maxOutputTokens: options.maxOutputTokens,
        abortSignal: signal,
      },
    });

    let finishReason: FinishReason | undefined;
    let promptBlocked = false;

    for await (const chunk of stream) {
      if (chunk.promptFeedback?.blockReason) promptBlocked = true;
      finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;

      const delta = chunk.text;
      if (delta) yield { type: "text", delta };
    }

    yield { type: "done", stopReason: toStopReason(finishReason, promptBlocked) };
  } catch (error) {
    if (signal.aborted) return;
    console.error("[chat] Gemini request failed", error);
    yield { type: "error", code: toErrorCode(error) };
  }
};
