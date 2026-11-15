import { describe, expect, it } from "vitest";

import { CHAT_LIMITS, chatRequestSchema } from "./schema";

const user = (content = "Hallo") => ({ role: "user" as const, content });
const assistant = (content = "Hi") => ({ role: "assistant" as const, content });

describe("chatRequestSchema", () => {
  it("accepts a conversation that starts and ends with a user message", () => {
    const result = chatRequestSchema.safeParse({ messages: [user(), assistant(), user("Und?")] });
    expect(result.success).toBe(true);
  });

  it.each([
    ["no messages", { messages: [] }],
    ["a missing body", undefined],
    ["an assistant message first", { messages: [assistant(), user()] }],
    ["an assistant message last", { messages: [user(), assistant()] }],
    ["blank content", { messages: [user("   ")] }],
    ["an unknown role", { messages: [{ role: "system", content: "x" }] }],
    ["an oversized message", { messages: [user("a".repeat(CHAT_LIMITS.maxMessageChars + 1))] }],
    [
      "too many messages",
      { messages: Array.from({ length: CHAT_LIMITS.maxMessages + 1 }, () => user()) },
    ],
  ])("rejects %s", (_label, input) => {
    expect(chatRequestSchema.safeParse(input).success).toBe(false);
  });
});
