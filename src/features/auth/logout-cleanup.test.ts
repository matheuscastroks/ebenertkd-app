import { afterEach, expect, it, vi } from "vitest";
import { prepareLogout } from "./logout-cleanup";

afterEach(() => { localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("limpa apenas rascunhos e identifica a inscrição deste navegador", async () => {
  localStorage.setItem("enrollment-draft:profile1", "dados");
  localStorage.setItem("enrollment-draft:profile2", "saúde");
  localStorage.setItem("theme", "dark");
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const getRegistration = vi.fn().mockResolvedValue({ pushManager: { getSubscription: async () => ({ endpoint: "https://push.example/device", unsubscribe }) } });
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
  const data = await prepareLogout();
  expect(data.get("push_endpoint")).toBe("https://push.example/device");
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("enrollment-draft:profile1")).toBeNull();
  expect(localStorage.getItem("enrollment-draft:profile2")).toBeNull();
  expect(localStorage.getItem("theme")).toBe("dark");
});

it("falha ao consultar push não impede limpar dados e continuar saída", async () => {
  localStorage.setItem("enrollment-draft:profile1", "dados");
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: vi.fn().mockRejectedValue(new Error("unavailable")) } });
  expect((await prepareLogout()).get("push_endpoint")).toBeNull();
  expect(localStorage.getItem("enrollment-draft:profile1")).toBeNull();
});

it("preserva o endpoint para revogar no servidor se unsubscribe local falhar", async () => {
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: "https://push.example/current", unsubscribe: async () => { throw new Error("unavailable"); } }) } }) } });
  expect((await prepareLogout()).get("push_endpoint")).toBe("https://push.example/current");
});

it("não espera indefinidamente por um service worker sem resposta", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", { serviceWorker: { getRegistration: () => new Promise(() => {}) } });
  const result = prepareLogout();
  await vi.advanceTimersByTimeAsync(1500);
  expect((await result).get("push_endpoint")).toBeNull();
});
