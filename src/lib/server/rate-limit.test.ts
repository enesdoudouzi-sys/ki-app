import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("blocks requests over the limit and reports when to retry", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });

    expect(limiter.check("a").allowed).toBe(true);
    now = 10_000;
    expect(limiter.check("a").allowed).toBe(true);
    now = 20_000;
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 40 });
  });

  it("allows requests again once the window has passed", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => now });

    expect(limiter.check("a").allowed).toBe(true);
    now = 60_001;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("counts each key separately", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });
});
