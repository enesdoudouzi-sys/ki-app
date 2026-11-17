import "server-only";

import type { ChatStreamEvent } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

import { getServerConfig, type Provider } from "./config";
import { retrieve } from "./knowledge";
import { streamAnthropic } from "./providers/anthropic";
import { streamGemini } from "./providers/gemini";
import type { ChatProvider } from "./providers/types";

const PROVIDERS: Record<Provider, ChatProvider> = {
  gemini: streamGemini,
  anthropic: streamAnthropic,
};

/**
 * Streams a reply from whichever provider is configured (`AI_PROVIDER`). Ist die Wissenssuche
 * eingeschaltet (`RAG_ENABLED=true`), wird zur letzten Nutzerfrage gesucht; die Quellen gehen
 * zuerst als eigenes Ereignis an den Browser, die Auszüge in die Systemanweisung.
 */
export async function* streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const config = getServerConfig();
  let context: string | undefined;

  if (config.ragEnabled) {
    const question = messages.findLast((message) => message.role === "user")?.content ?? "";
    const retrieval = retrieve(question, {
      directory: config.ragSourceDir,
      urlBase: config.ragSourceUrlBase,
    });
    if (retrieval) {
      context = retrieval.context;
      yield { type: "sources", sources: retrieval.sources };
    }
  }

  yield* PROVIDERS[config.provider](messages, signal, {
    model: config.model,
    maxOutputTokens: config.maxOutputTokens,
    context,
  });
}
