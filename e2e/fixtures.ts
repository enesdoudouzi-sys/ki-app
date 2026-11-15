import { test as base, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { E2E_AUTH } from "../playwright.config";

/**
 * Signs a real session cookie with the test secret instead of driving GitHub's
 * login UI, so the app's own session validation still runs end to end.
 */
export async function signInAs(context: BrowserContext, login: string, baseURL: string) {
  const token = await encode({
    secret: E2E_AUTH.secret,
    token: { sub: login, name: "E2E User", login },
  });
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** `page` is signed in as the allowlisted test user. */
export const test = base.extend({
  page: async ({ page, context, baseURL }, run) => {
    await signInAs(context, E2E_AUTH.allowedUser, baseURL!);
    await run(page);
  },
});

export { expect } from "@playwright/test";
