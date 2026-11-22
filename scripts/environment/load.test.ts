// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function probe(mode: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "ebener-env-"));
  directories.push(dir);
  writeFileSync(path.join(dir, ".env"), "NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.example/v1\nONLY_PRODUCTION=secret\nVALUE=production\n");
  writeFileSync(path.join(dir, ".env.local"), "NEXT_PUBLIC_APPWRITE_ENDPOINT=http://localhost:8080/v1\nVALUE=local\n");
  const loader = path.resolve("scripts/environment/load.ts");
  const code = `const { loadProjectEnv } = require(${JSON.stringify(loader)}); loadProjectEnv(${JSON.stringify(dir)}); const env = require('@next/env'); env.loadEnvConfig(${JSON.stringify(dir)}); env.loadEnvConfig(${JSON.stringify(dir)}, true, console, true); console.log(JSON.stringify({ value: process.env.VALUE, production: process.env.ONLY_PRODUCTION }));`;
  return JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "-e", code], {
    cwd: process.cwd(), env: { ...process.env, APP_ENV: mode, EBENER_ENV_LOADED: "", __NEXT_PROCESSED_ENV: "" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  }));
}

describe("explicit project environments", () => {
  it("loads development without falling back to production secrets", () => {
    expect(probe("development")).toEqual({ value: "local", production: "" });
  });
  it("loads production even when .env.local exists", () => {
    expect(probe("production")).toEqual({ value: "production", production: "secret" });
  });
  it("rejects an unknown environment", () => {
    expect(() => probe("typo")).toThrow();
  });
  it("selects production for the public CI server that uses build/start", () => {
    const configuration = path.resolve("playwright.config.ts");
    const code = `require(${JSON.stringify(configuration)}); console.log(process.env.APP_ENV);`;
    const output = execFileSync(process.execPath, ["--import", "tsx", "-e", code], {
      cwd: process.cwd(),
      env: { ...process.env, CI: "true", APP_ENV: undefined, EBENER_ENV_LOADED: "", E2E_APPWRITE_PROJECT_ID: "", __NEXT_PROCESSED_ENV: "" },
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    });
    expect(output.trim()).toBe("production");
  });
  it("preserves optional deployment defaults when only the example file exists", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ebener-ci-"));
    directories.push(dir);
    writeFileSync(path.join(dir, ".env.example"), "APPWRITE_DATABASE_ID=ebenertkd\nAPPWRITE_STORAGE_BUCKET_ID=private-files\n");
    const loader = path.resolve("scripts/environment/load.ts");
    const code = `require(${JSON.stringify(loader)}).loadProjectEnv(${JSON.stringify(dir)}); console.log(JSON.stringify({ database: process.env.APPWRITE_DATABASE_ID, bucket: process.env.APPWRITE_STORAGE_BUCKET_ID }));`;
    const output = execFileSync(process.execPath, ["--import", "tsx", "-e", code], {
      cwd: process.cwd(), env: { ...process.env, APP_ENV: "production", EBENER_ENV_LOADED: "", APPWRITE_DATABASE_ID: undefined, APPWRITE_STORAGE_BUCKET_ID: undefined },
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    });
    expect(JSON.parse(output)).toEqual({});
  });
});
