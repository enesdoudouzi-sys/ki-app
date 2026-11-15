import { z } from "zod";

import { chatRoleSchema } from "./schema";

/** Scoped per user so accounts sharing a browser never see each other's conversation. */
const storageKey = (userId: string) => `ki-chat:conversation:v1:${userId}`;

export const storedMessageSchema = z.object({
  id: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  notice: z.string().optional(),
});
export type StoredMessage = z.infer<typeof storedMessageSchema>;

/** Storage can be unavailable (private mode, blocked site data) — the chat must work without it. */
export function loadConversation(userId: string): StoredMessage[] {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = z.array(storedMessageSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveConversation(userId: string, messages: StoredMessage[]): void {
  try {
    if (messages.length === 0) window.localStorage.removeItem(storageKey(userId));
    else window.localStorage.setItem(storageKey(userId), JSON.stringify(messages));
  } catch {
    // Persistence is a convenience; ignore quota and access errors.
  }
}
