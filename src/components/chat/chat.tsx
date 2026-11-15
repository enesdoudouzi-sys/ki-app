"use client";

import { signOut } from "next-auth/react";

import { useChat } from "@/hooks/use-chat";

import { Composer } from "./composer";
import { MessageList } from "./message-list";

export interface ChatUser {
  login: string;
  name: string;
}

export function Chat({ user }: { user: ChatUser }) {
  const { messages, status, error, send, stop, reset } = useChat(user.login);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">KI-Chat</h1>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-sm text-muted sm:inline" title={user.login}>
            {user.name}
          </span>
          <button
            type="button"
            onClick={reset}
            disabled={messages.length === 0}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-40"
          >
            Neuer Chat
          </button>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
          >
            Abmelden
          </button>
        </div>
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
