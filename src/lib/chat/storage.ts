import { z } from "zod";

import { chatRoleSchema } from "./schema";

const STORAGE_KEY = "ki-chat:conversation:v1";

export const storedMessageSchema = z.object({
  id: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  notice: z.string().optional(),
});
export type StoredMessage = z.infer<typeof storedMessageSchema>;

/** Storage can be unavailable (private mode, blocked site data) — the chat must work without it. */
export function loadConversation(): StoredMessage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(storedMessageSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveConversation(messages: StoredMessage[]): void {
  try {
    if (messages.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Persistence is a convenience; ignore quota and access errors.
  }
}
