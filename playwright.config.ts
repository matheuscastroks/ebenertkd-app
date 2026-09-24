import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const localChannel = process.env.E2E_BROWSER_CHANNEL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: localChannel ? "off" : "retain-on-failure"
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], channel: localChannel } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], channel: localChannel } }
  ]
});
