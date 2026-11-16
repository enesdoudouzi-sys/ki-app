import type { ChatStreamEvent } from "@/lib/chat/protocol";
import type { ChatMessage } from "@/lib/chat/schema";

export const SYSTEM_PROMPT = [
  "You are a helpful assistant in a web chat application.",
  "Reply in the language the user writes in.",
  "The interface renders Markdown, so use it where it helps readability, including fenced code blocks with a language tag for code.",
].join(" ");

export interface ProviderOptions {
  model: string;
  maxOutputTokens: number;
}

/**
 * Streams a model reply as protocol events. Implementations never throw:
 * failures become an `error` event so the HTTP stream can always be closed
 * cleanly, and upstream error details are logged server-side rather than
 * forwarded to the browser.
 */
export type ChatProvider = (
  messages: ChatMessage[],
  signal: AbortSignal,
  options: ProviderOptions,
) => AsyncGenerator<ChatStreamEvent>;
