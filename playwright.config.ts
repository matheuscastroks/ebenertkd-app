import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";
import { assertIsolatedEnvironment } from "./scripts/testing/e2e-environment";

loadEnvConfig(process.cwd());

const isolated = Boolean(process.env.E2E_APPWRITE_PROJECT_ID);
if (isolated) assertIsolatedEnvironment();
const baseURL = process.env.E2E_BASE_URL || (isolated ? "http://127.0.0.1:3101" : "http://127.0.0.1:3000");
const isolatedURL = new URL(baseURL);
const isolatedPort = Number(isolatedURL.port || "80");
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
  webServer: isolated ? {
    // A fresh process prevents accidentally reusing a dev server running with production credentials.
    command: `npm run dev -- --hostname ${isolatedURL.hostname.replaceAll("[", "").replaceAll("]", "")} --port ${isolatedPort}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { APP_URL: baseURL, NEXT_PUBLIC_APP_URL: baseURL },
    timeout: 120_000
  } : process.env.E2E_BASE_URL ? undefined : {
    // No CI o servidor de desenvolvimento compila cada rota sob demanda e é lento demais para a hidratação;
    // por isso o smoke público roda contra o build de produção.
    command: process.env.CI
      ? `npm run build && npm run start -- --hostname ${isolatedURL.hostname.replaceAll("[", "").replaceAll("]", "")} --port ${isolatedPort}`
      : `npm run dev -- --hostname ${isolatedURL.hostname.replaceAll("[", "").replaceAll("]", "")} --port ${isolatedPort}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 420_000 : 120_000
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], channel: localChannel } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], channel: localChannel } }
  ]
});
