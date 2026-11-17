"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { ERROR_MESSAGES, STOP_NOTICES } from "@/lib/chat/messages";
import { errorCodeSchema, readEvents, type ErrorCode, type Source } from "@/lib/chat/protocol";
import { loadConversation, saveConversation, type StoredMessage } from "@/lib/chat/storage";

export type ChatStatus = "idle" | "streaming";

interface State {
  messages: StoredMessage[];
  status: ChatStatus;
  error: string | null;
}

type Action =
  | { type: "submitted"; user: StoredMessage; assistant: StoredMessage }
  | { type: "sources"; id: string; sources: Source[] }
  | { type: "delta"; id: string; delta: string }
  | { type: "finished"; id: string; notice?: string }
  | { type: "failed"; id: string; error: string }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "submitted":
      return {
        messages: [...state.messages, action.user, action.assistant],
        status: "streaming",
        error: null,
      };
    case "sources":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.id ? { ...message, sources: action.sources } : message,
        ),
      };
    case "delta":
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.id
            ? { ...message, content: message.content + action.delta }
            : message,
        ),
      };
    case "finished":
      return {
        ...state,
        status: "idle",
        messages: state.messages
          // A stopped or refused turn can leave an empty reply; drop it unless it carries a notice.
          .filter((m) => m.id !== action.id || m.content !== "" || action.notice)
          .map((m) => (m.id === action.id && action.notice ? { ...m, notice: action.notice } : m)),
      };
    case "failed":
      return {
        status: "idle",
        error: action.error,
        messages: state.messages.filter((m) => m.id !== action.id || m.content !== ""),
      };
    case "reset":
      return { messages: [], status: "idle", error: null };
  }
}

async function errorCodeFromResponse(response: Response): Promise<ErrorCode> {
  const body: unknown = await response.json().catch(() => undefined);
  const code = errorCodeSchema.safeParse(
    (body as { error?: { code?: unknown } } | undefined)?.error?.code,
  );
  return code.success ? code.data : "internal";
}

/** Must only be mounted in the browser: the initial state reads localStorage. */
export function useChat(userId: string) {
  const [state, dispatch] = useReducer(reducer, undefined, (): State => ({
    messages: loadConversation(userId),
    status: "idle",
    error: null,
  }));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state.status === "idle") saveConversation(userId, state.messages);
  }, [userId, state.messages, state.status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || state.status === "streaming") return;

      const user: StoredMessage = { id: crypto.randomUUID(), role: "user", content };
      const assistant: StoredMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
      dispatch({ type: "submitted", user, assistant });

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...state.messages, user]
              .filter((message) => message.content.trim() !== "")
              .map(({ role, content }) => ({ role, content })),
          }),
          signal: abort.signal,
        });

        if (!response.ok || !response.body) {
          const code = await errorCodeFromResponse(response);
          dispatch({ type: "failed", id: assistant.id, error: ERROR_MESSAGES[code] });
          return;
        }

        for await (const event of readEvents(response.body)) {
          if (event.type === "sources") {
            dispatch({ type: "sources", id: assistant.id, sources: event.sources });
          } else if (event.type === "text") {
            dispatch({ type: "delta", id: assistant.id, delta: event.delta });
          } else if (event.type === "done") {
            dispatch({
              type: "finished",
              id: assistant.id,
              notice: STOP_NOTICES[event.stopReason],
            });
            return;
          } else {
            dispatch({ type: "failed", id: assistant.id, error: ERROR_MESSAGES[event.code] });
            return;
          }
        }
        // Stream ended without a terminal event (e.g. connection dropped).
        dispatch({ type: "failed", id: assistant.id, error: ERROR_MESSAGES.upstream_unavailable });
      } catch {
        if (abort.signal.aborted) dispatch({ type: "finished", id: assistant.id });
        else dispatch({ type: "failed", id: assistant.id, error: ERROR_MESSAGES.internal });
      } finally {
        if (abortRef.current === abort) abortRef.current = null;
      }
    },
    [state.messages, state.status],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  return { ...state, send, stop, reset };
}
