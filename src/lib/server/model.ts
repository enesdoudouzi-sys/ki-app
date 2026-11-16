import "server-only";

import type { ChatStreamEvent } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

import { getServerConfig, type Provider } from "./config";
import { streamAnthropic } from "./providers/anthropic";
import { streamGemini } from "./providers/gemini";
import type { ChatProvider } from "./providers/types";

const PROVIDERS: Record<Provider, ChatProvider> = {
  gemini: streamGemini,
  anthropic: streamAnthropic,
};

/** Streams a reply from whichever provider is configured (`AI_PROVIDER`). */
export function streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const { provider, model, maxOutputTokens } = getServerConfig();
  return PROVIDERS[provider](messages, signal, { model, maxOutputTokens });
}
