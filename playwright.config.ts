import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL || "http://localhost:3000";
const API_URL = process.env.E2E_API_URL || "http://localhost:4000";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: WEB_URL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /responsive\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @labops/api start",
      url: `${API_URL}/health`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @labops/web start",
      url: WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
