// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getServerConfig } from "./config";

beforeEach(() => {
  for (const key of [
    "AI_PROVIDER",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_MODEL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_MODEL",
    "CHAT_MAX_OUTPUT_TOKENS",
  ]) {
    vi.stubEnv(key, "");
  }
});

describe("getServerConfig", () => {
  it("defaults to Gemini and reports missing credentials", () => {
    expect(getServerConfig()).toMatchObject({
      provider: "gemini",
      model: "gemini-3.8-flash",
      hasCredentials: false,
    });
  });

  it("only counts the selected provider's key as credentials", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    expect(getServerConfig().hasCredentials).toBe(false);

    vi.stubEnv("GEMINI_API_KEY", "key");
    expect(getServerConfig().hasCredentials).toBe(true);
  });

  it("switches to Anthropic when selected", () => {
    vi.stubEnv("AI_PROVIDER", "Anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-haiku-5-5");

    expect(getServerConfig()).toMatchObject({
      provider: "anthropic",
      model: "claude-haiku-5-5",
      hasCredentials: true,
    });
  });

  it("ignores invalid numeric overrides", () => {
    vi.stubEnv("CHAT_MAX_OUTPUT_TOKENS", "-5");
    expect(getServerConfig().maxOutputTokens).toBe(16_000);
  });
});
