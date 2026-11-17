import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  endpoint: vi.fn(), project: vi.fn(), ping: vi.fn(), construct: vi.fn(),
}));
vi.mock("appwrite", () => ({ Client: class {
  constructor() { sdk.construct(); }
  setEndpoint(value: string) { sdk.endpoint(value); return this; }
  setProject(value: string) { sdk.project(value); return this; }
  ping() { return sdk.ping(); }
} }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sdk.ping.mockResolvedValue({ status: "ok" });
});
afterEach(() => vi.unstubAllEnvs());

describe("cliente Appwrite do navegador", () => {
  it("usa somente endpoint e projeto efetivos e deduplica o ping", async () => {
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "https://isolated.example.test/v1");
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "isolated-e2e-project");
    const browser = await import("./browser");
    const first = browser.pingAppwriteOnce();
    const second = browser.pingAppwriteOnce();
    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ status: "ok" });
    expect(sdk.endpoint).toHaveBeenCalledExactlyOnceWith("https://isolated.example.test/v1");
    expect(sdk.project).toHaveBeenCalledExactlyOnceWith("isolated-e2e-project");
    expect(sdk.ping).toHaveBeenCalledOnce();
  });
  it.each([
    [undefined, undefined],
    ["https://isolated.example.test/v1", undefined],
    [undefined, "isolated-e2e-project"],
    ["not-a-url", "isolated-e2e-project"],
    ["https://isolated.example.test/v1", "  "],
  ])("sem configuração válida rejeita sem inicializar SDK nem enviar rede: %s / %s", async (endpoint, projectId) => {
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", endpoint);
    vi.stubEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", projectId);
    const browser = await import("./browser");
    const first = browser.pingAppwriteOnce();
    expect(browser.pingAppwriteOnce()).toBe(first);
    await expect(first).rejects.toThrow("appwrite_browser_configuration_missing");
    expect(sdk.construct).not.toHaveBeenCalled();
    expect(sdk.endpoint).not.toHaveBeenCalled();
    expect(sdk.project).not.toHaveBeenCalled();
    expect(sdk.ping).not.toHaveBeenCalled();
  });
});
