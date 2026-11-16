import "server-only";

export type Provider = "gemini" | "anthropic";

const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: "gemini-3.8-flash",
  anthropic: "claude-opus-5-5",
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getServerConfig() {
  const env = process.env;
  const provider: Provider =
    env.AI_PROVIDER?.trim().toLowerCase() === "anthropic" ? "anthropic" : "gemini";

  const model =
    (provider === "gemini" ? env.GEMINI_MODEL : env.ANTHROPIC_MODEL)?.trim() ||
    DEFAULT_MODELS[provider];

  const hasCredentials =
    provider === "gemini"
      ? Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY)
      : Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);

  return {
    provider,
    model,
    hasCredentials,
    maxOutputTokens: positiveInt(env.CHAT_MAX_OUTPUT_TOKENS, 16_000),
    rateLimitPerMinute: positiveInt(env.CHAT_RATE_LIMIT_PER_MINUTE, 20),
  };
}
