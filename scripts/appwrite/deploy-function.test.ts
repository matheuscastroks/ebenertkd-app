// @vitest-environment node
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ schedule: "15 3 * * *", cleaned: false, updates: [] as Array<Record<string, unknown>> }));
vi.mock("@next/env", () => ({ loadEnvConfig: vi.fn() }));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
vi.mock("node:fs/promises", () => ({
  mkdtemp: async (prefix: string) => `${prefix}test`,
  rm: async () => { state.cleaned = true; }
}));
vi.mock("../../src/lib/appwrite/config", () => ({ readServerAppwriteConfig: () => ({ endpoint: "https://example.test/v1", projectId: "project", apiKey: "test-key", databaseId: "database", bucketId: "bucket" }) }));
vi.mock("node-appwrite/file", () => ({ InputFile: { fromPath: vi.fn() } }));
vi.mock("node-appwrite", async (original) => {
  const sdk = await original<typeof import("node-appwrite")>();
  class Client {
    setEndpoint() { return this; }
    setProject() { return this; }
    setKey() { return this; }
  }
  class Functions {
    async get() { return { name: "Daily operations", schedule: state.schedule }; }
    async listVariables() { return { variables: [] }; }
    async createVariable() { return {}; }
    async update(input: Record<string, unknown>) {
      state.updates.push(input);
      // Appwrite clears cron when an update omits schedule.
      state.schedule = typeof input.schedule === "string" ? input.schedule : "";
      return {};
    }
    async createDeployment() { return { $id: "deployment-test" }; }
    async getDeployment() { return { status: "ready" }; }
  }
  return { ...sdk, Client, Functions };
});

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  state.schedule = "15 3 * * *";
  state.cleaned = false;
  state.updates = [];
  for (const key of ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "PUSH_SUBSCRIPTION_ENCRYPTION_KEY", "GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_REFRESH_TOKEN", "GOOGLE_DRIVE_FOLDER_ID", "BACKUP_ENCRYPTION_KEY"]) vi.stubEnv(key, "test-value");
});
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.unstubAllEnvs();
});

describe("function deployment", () => {
  it.each(["daily-operations", "backup"])("preserves the existing %s cron while updating scopes and deploying", async (functionId) => {
    const expectedSchedule = functionId === "backup" ? "45 3 * * *" : "15 3 * * *";
    state.schedule = expectedSchedule;
    process.argv = [originalArgv[0], path.join(tmpdir(), "deploy-function.ts"), functionId];
    await import("./deploy-function");
    await vi.waitFor(() => expect(state.cleaned).toBe(true));
    expect(state.updates).toHaveLength(1);
    expect(state.schedule).toBe(expectedSchedule);
    expect(process.exitCode).toBe(originalExitCode);
  });
});
