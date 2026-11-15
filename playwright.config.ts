import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/** Test-only values. The suite signs its own session cookies with this secret. */
export const E2E_AUTH = {
  secret: "e2e-only-secret-not-used-anywhere-else",
  allowedUser: "e2e-user",
} as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    launchOptions: {
      // Lets environments with a preinstalled browser point at it.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `${BASE_URL}/login`,
    env: {
      NEXTAUTH_URL: BASE_URL,
      NEXTAUTH_SECRET: E2E_AUTH.secret,
      AUTH_ALLOWED_USERS: E2E_AUTH.allowedUser,
      GITHUB_ID: "e2e",
      GITHUB_SECRET: "e2e",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
