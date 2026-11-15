import "server-only";

const DEFAULT_MODEL = "claude-opus-5-5";

/** Models that accept the server-side refusal fallback parameter. */
const FALLBACK_CAPABLE_MODELS = new Set([
  "claude-fable-5-2",
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getServerConfig() {
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  return {
    model,
    maxOutputTokens: positiveInt(process.env.CHAT_MAX_OUTPUT_TOKENS, 16_000),
    supportsFallbacks: FALLBACK_CAPABLE_MODELS.has(model),
    hasCredentials: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
    rateLimitPerMinute: positiveInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE, 20),
  };
}
