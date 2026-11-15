"use client";

import { useChat } from "@/hooks/use-chat";

import { Composer } from "./composer";
import { MessageList } from "./message-list";

export function Chat() {
  const { messages, status, error, send, stop, reset } = useChat();

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">KI-Chat</h1>
        <button
          type="button"
          onClick={reset}
          disabled={messages.length === 0}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-40"
        >
          Neuer Chat
        </button>
      </header>

      <MessageList messages={messages} status={status} />

      {error ? (
        <p role="alert" className="mx-auto mb-2 w-full max-w-3xl px-4 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Composer status={status} onSend={send} onStop={stop} />
    </div>
  );
}
