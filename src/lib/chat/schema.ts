import { z } from "zod";

/** Limits enforced on both client and server. Oversized input is rejected, never truncated. */
export const CHAT_LIMITS = {
  maxMessages: 100,
  maxMessageChars: 20_000,
} as const;

export const chatRoleSchema = z.enum(["user", "assistant"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1).max(CHAT_LIMITS.maxMessageChars),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(CHAT_LIMITS.maxMessages)
    .refine((messages) => messages[0]?.role === "user", {
      message: "The first message must come from the user.",
    })
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "The last message must come from the user.",
    }),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
