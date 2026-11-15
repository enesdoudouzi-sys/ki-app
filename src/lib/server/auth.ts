import "server-only";

import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { connection } from "next/server";

import { isLoginAllowed, parseAllowlist } from "./allowlist";

export interface CurrentUser {
  /** GitHub username, lowercased. Stable identifier for rate limiting and storage. */
  login: string;
  name: string;
}

const allowlist = () => parseAllowlist(process.env.AUTH_ALLOWED_USERS);

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  // Stateless sessions in an encrypted, HttpOnly cookie: no database required.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    signIn({ profile }) {
      return isLoginAllowed(profile?.login, allowlist());
    },
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login.toLowerCase();
      return token;
    },
    session({ session, token }) {
      session.user.login = token.login;
      return session;
    },
  },
};

/**
 * The single place that decides whether a request is authenticated. The
 * allowlist is re-checked on every call, so removing a user revokes access
 * immediately instead of when their session cookie expires.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Session checks are per request; this keeps them out of any prerendered shell.
  await connection();
  const session = await getServerSession(authOptions);
  const login = session?.user.login;
  if (!login || !isLoginAllowed(login, allowlist())) return null;
  return { login, name: session.user.name || login };
}
