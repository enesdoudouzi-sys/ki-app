"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

import type { ChatStatus } from "@/hooks/use-chat";
import { CHAT_LIMITS } from "@/lib/chat/schema";

interface Props {
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function Composer({ status, onSend, onStop }: Props) {
  const [text, setText] = useState("");
  const isStreaming = status === "streaming";
  const tooLong = text.length > CHAT_LIMITS.maxMessageChars;
  const canSend = !isStreaming && !tooLong && text.trim() !== "";

  function submit() {
    if (!canSend) return;
    onSend(text);
    setText("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline; ignore Enter while an IME is composing.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-accent">
        <label htmlFor="chat-input" className="sr-only">
          Nachricht
        </label>
        <textarea
          id="chat-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben …"
          rows={1}
          autoFocus
          aria-invalid={tooLong}
          aria-describedby={tooLong ? "chat-input-error" : undefined}
          className="max-h-48 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none field-sizing-content placeholder:text-muted"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="h-11 rounded-xl border border-border px-4 font-medium hover:bg-background"
          >
            Stopp
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="h-11 rounded-xl bg-accent px-4 font-medium text-accent-foreground disabled:opacity-40"
          >
            Senden
          </button>
        )}
      </div>
      {tooLong ? (
        <p id="chat-input-error" className="mt-2 text-sm text-danger">
          Die Nachricht ist zu lang (maximal {CHAT_LIMITS.maxMessageChars.toLocaleString("de-DE")}{" "}
          Zeichen).
        </p>
      ) : null}
    </form>
  );
}
