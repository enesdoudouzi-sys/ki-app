import { expect, test } from "./fixtures";

/** The model API is mocked at the network boundary, so no API key is needed. */
function ndjson(events: object[]): string {
  return events.map((event) => `${JSON.stringify(event)}\n`).join("");
}

test("user can chat, reload, and start over", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      contentType: "application/x-ndjson",
      body: ndjson([
        { type: "text", delta: "Hallo! Ich bin der " },
        { type: "text", delta: "**Assistent**." },
        { type: "done", stopReason: "complete" },
      ]),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Wie kann ich helfen?" })).toBeVisible();

  await page.getByLabel("Nachricht").fill("Wer bist du?");
  await page.getByLabel("Nachricht").press("Enter");

  await expect(page.getByText("Wer bist du?")).toBeVisible();
  await expect(page.locator("strong", { hasText: "Assistent" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Wer bist du?")).toBeVisible();

  await page.getByRole("button", { name: "Neuer Chat" }).click();
  await expect(page.getByRole("heading", { name: "Wie kann ich helfen?" })).toBeVisible();
});

test("shows an error when the server rejects the request", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({ status: 429, json: { error: { code: "rate_limited" } } });
  });

  await page.goto("/");
  await page.getByLabel("Nachricht").fill("Hallo");
  await page.getByRole("button", { name: "Senden" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Zu viele Anfragen" })).toBeVisible();
});

test("page has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
