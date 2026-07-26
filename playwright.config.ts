import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "https://ps-jewellers-mudita-diamond-collect.vercel.app";

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
