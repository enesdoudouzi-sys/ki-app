export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (0 when allowed). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

interface Options {
  limit: number;
  windowMs: number;
  now?: () => number;
}

/**
 * Sliding-window limiter held in process memory.
 *
 * Good enough for a single instance. On serverless or multi-instance
 * deployments each instance counts separately — swap in a shared store
 * (e.g. Redis) behind the same `RateLimiter` interface.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: Options): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const current = now();
      const windowStart = current - windowMs;
      const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? current;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - current) / 1000)),
        };
      }

      recent.push(current);
      hits.set(key, recent);

      // Opportunistic cleanup so idle keys do not accumulate forever.
      if (hits.size > 10_000) {
        for (const [otherKey, timestamps] of hits) {
          if (timestamps.every((timestamp) => timestamp <= windowStart)) hits.delete(otherKey);
        }
      }

      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "anonymous";
}
