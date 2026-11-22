import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { loadProjectEnv } from "./scripts/environment/load";

loadProjectEnv();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15000,
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**", ".next-local/**", ".next-validation/**", ".local/**", ".claude/**"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
