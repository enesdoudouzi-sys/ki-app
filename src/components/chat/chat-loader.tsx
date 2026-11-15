"use client";

import { useSyncExternalStore } from "react";

import { Chat, type ChatUser } from "./chat";

const subscribe = () => () => {};

/**
 * The conversation lives in localStorage, which the server cannot see. Rendering
 * the chat only after hydration avoids a server/client markup mismatch.
 */
export function ChatLoader({ user }: { user: ChatUser }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return isClient ? <Chat user={user} /> : null;
}
