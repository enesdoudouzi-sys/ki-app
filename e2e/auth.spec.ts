import { expect, test } from "@playwright/test";

import { signInAs } from "./fixtures";

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Mit GitHub anmelden" })).toBeVisible();
});

test("the chat API rejects signed-out requests", async ({ request }) => {
  const response = await request.post("/api/chat", {
    data: { messages: [{ role: "user", content: "Hallo" }] },
  });

  expect(response.status()).toBe(401);
});

test("a valid session for a user who is not on the allowlist is rejected", async ({
  page,
  context,
  baseURL,
}) => {
  await signInAs(context, "someone-else", baseURL!);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  const response = await context.request.post("/api/chat", {
    data: { messages: [{ role: "user", content: "Hallo" }] },
  });
  expect(response.status()).toBe(401);
});

test("a forged session cookie is rejected", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "next-auth.session-token", value: "not-a-real-token", url: baseURL! },
  ]);

  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
});

test("signed-in users skip the login page", async ({ page, context, baseURL }) => {
  await signInAs(context, "e2e-user", baseURL!);

  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Abmelden" })).toBeVisible();
});

test("the login page explains a denied account", async ({ page }) => {
  await page.goto("/login?error=AccessDenied");

  await expect(page.getByRole("alert").filter({ hasText: "nicht freigeschaltet" })).toBeVisible();
});

test("signing out ends the session", async ({ page, context, baseURL }) => {
  await signInAs(context, "e2e-user", baseURL!);
  await page.goto("/");

  await page.getByRole("button", { name: "Abmelden" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
