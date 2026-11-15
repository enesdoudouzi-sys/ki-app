"use client";

import { useEffect, useRef } from "react";

import type { ChatStatus } from "@/hooks/use-chat";
import type { StoredMessage } from "@/lib/chat/storage";

import { MessageBubble } from "./message-bubble";

interface Props {
  messages: StoredMessage[];
  status: ChatStatus;
}

export function MessageList({ messages, status }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, lastMessage?.content]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <h2 className="text-2xl font-semibold">Wie kann ich helfen?</h2>
        <p className="text-muted">Stell eine Frage, um den Chat zu beginnen.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <ol
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6"
        aria-label="Chatverlauf"
        aria-live="polite"
        aria-busy={status === "streaming"}
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={status === "streaming" && message.id === lastMessage?.id}
          />
        ))}
      </ol>
      <div ref={endRef} />
    </div>
  );
}
