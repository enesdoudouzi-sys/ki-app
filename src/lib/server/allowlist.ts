/**
 * Access is denied unless explicitly granted: every signed-in user spends the
 * operator's API budget, so an unset allowlist admits no one.
 *
 * `AUTH_ALLOWED_USERS` is a comma-separated list of GitHub usernames, or `*`
 * to admit any GitHub account.
 */
export type Allowlist = { mode: "all" } | { mode: "list"; logins: ReadonlySet<string> };

export function parseAllowlist(value: string | undefined): Allowlist {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (entries.includes("*")) return { mode: "all" };
  return { mode: "list", logins: new Set(entries) };
}

export function isLoginAllowed(login: string | null | undefined, allowlist: Allowlist): boolean {
  if (!login) return false;
  return allowlist.mode === "all" || allowlist.logins.has(login.toLowerCase());
}
