import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL?.trim() || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    storageState: process.env.E2E_ADMIN_STORAGE_STATE || undefined,
  },
  webServer: process.env.E2E_BASE_URL?.trim()
    ? undefined
    : {
        command: "npm run start",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
