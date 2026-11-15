"use client";

import { useSyncExternalStore } from "react";

import { Chat } from "./chat";

const subscribe = () => () => {};

/**
 * The conversation lives in localStorage, which the server cannot see. Rendering
 * the chat only after hydration avoids a server/client markup mismatch.
 */
export function ChatLoader() {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return isClient ? <Chat /> : null;
}
