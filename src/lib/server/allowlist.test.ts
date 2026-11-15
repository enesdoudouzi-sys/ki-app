import { describe, expect, it } from "vitest";

import { isLoginAllowed, parseAllowlist } from "./allowlist";

describe("allowlist", () => {
  it.each([undefined, "", " , "])("admits no one when unset (%j)", (value) => {
    expect(isLoginAllowed("anyone", parseAllowlist(value))).toBe(false);
  });

  it("admits listed users, ignoring case and whitespace", () => {
    const allowlist = parseAllowlist(" Alice , bob ");
    expect(isLoginAllowed("alice", allowlist)).toBe(true);
    expect(isLoginAllowed("BOB", allowlist)).toBe(true);
    expect(isLoginAllowed("mallory", allowlist)).toBe(false);
  });

  it("admits any account with a wildcard", () => {
    expect(isLoginAllowed("anyone", parseAllowlist("*"))).toBe(true);
  });

  it("never admits a missing login", () => {
    expect(isLoginAllowed(undefined, parseAllowlist("*"))).toBe(false);
    expect(isLoginAllowed("", parseAllowlist("*"))).toBe(false);
  });
});
