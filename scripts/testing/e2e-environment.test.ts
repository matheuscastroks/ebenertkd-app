import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertIsolatedEnvironment } from "./e2e-environment";

beforeEach(() => {
  vi.stubEnv("E2E_APPWRITE_PROJECT_ID", "isolated-test");
  vi.stubEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "isolated-test");
  vi.stubEnv("APPWRITE_PROJECT_ID", undefined);
  vi.stubEnv("PRODUCTION_APPWRITE_PROJECT_ID", undefined);
  vi.stubEnv("E2E_BASE_URL", "http://127.0.0.1:3101");
});
afterEach(() => vi.unstubAllEnvs());

describe("isolamento de E2E autenticado sem rede", () => {
  it("recusa projeto isolado ausente", () => {
    vi.stubEnv("E2E_APPWRITE_PROJECT_ID", undefined);
    expect(() => assertIsolatedEnvironment()).toThrow(/E2E_APPWRITE_PROJECT_ID/);
  });

  it("recusa produção conhecida mesmo sem variável PRODUCTION", () => {
    vi.stubEnv("E2E_APPWRITE_PROJECT_ID", "6ab4c32e00317977eeb6");
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "6ab4c32e00317977eeb6");
    expect(() => assertIsolatedEnvironment()).toThrow(/production Appwrite/);
  });

  it("recusa produção adicional informada pelo ambiente", () => {
    vi.stubEnv("PRODUCTION_APPWRITE_PROJECT_ID", "isolated-test");
    expect(() => assertIsolatedEnvironment()).toThrow(/production Appwrite/);
  });

  it("recusa projeto público divergente", () => {
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "another-project");
    expect(() => assertIsolatedEnvironment()).toThrow(/application must use/);
  });

  it("recusa projeto de servidor divergente", () => {
    vi.stubEnv("APPWRITE_PROJECT_ID", "another-project");
    expect(() => assertIsolatedEnvironment()).toThrow(/server project/);
  });

  it("recusa aplicação remota mesmo com IDs isolados", () => {
    vi.stubEnv("E2E_BASE_URL", "http://example.com:3101");
    expect(() => assertIsolatedEnvironment()).toThrow(/remote deployments/);
  });

  it.each(["http://127.0.0.1:3101", "http://localhost:3101", "http://[::1]:3101"])("aceita aplicação local %s com projeto isolado", (url) => {
    vi.stubEnv("E2E_BASE_URL", url);
    expect(() => assertIsolatedEnvironment()).not.toThrow();
  });

  it("não acumula IDs de produção customizados entre chamadas", () => {
    vi.stubEnv("PRODUCTION_APPWRITE_PROJECT_ID", "isolated-test");
    expect(() => assertIsolatedEnvironment()).toThrow();
    vi.stubEnv("PRODUCTION_APPWRITE_PROJECT_ID", "production-custom");
    expect(() => assertIsolatedEnvironment()).not.toThrow();
  });
});
