import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireCapability: vi.fn(async () => ({ $id: "g1" })), requireProfile: vi.fn() }));
vi.mock("@/features/auth/service", () => ({ createMinorAccount: vi.fn() }));
const service = vi.hoisted(() => ({ enableGuardianCapability: vi.fn(), resetMinorPassword: vi.fn(), revokeMinorSessions: vi.fn() }));
vi.mock("@/features/families/service", () => service);

import { resetMinorPasswordAction, revokeMinorSessionsAction } from "./family";

const form = (data: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(data)) f.set(k, v); return f; };

describe("ações do responsável sobre o menor", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("senha trocada com sucesso volta com confirmação", async () => {
    await expect(resetMinorPasswordAction(form({ minor_profile_id: "m1", password: "senha-forte-1" }))).rejects.toThrow("REDIRECT:/responsavel/dependentes?reset=1");
  });

  it("falha do serviço vira erro amigável, não exceção solta", async () => {
    service.resetMinorPassword.mockRejectedValue(new Error("minor_not_linked"));
    await expect(resetMinorPasswordAction(form({ minor_profile_id: "m1", password: "senha-forte-1" }))).rejects.toThrow("REDIRECT:/responsavel/dependentes?error=minor");
  });

  it("encerrar sessões confirma e trata falha", async () => {
    await expect(revokeMinorSessionsAction(form({ minor_profile_id: "m1" }))).rejects.toThrow("?revoked=1");
    service.revokeMinorSessions.mockRejectedValue(new Error("minor_not_linked"));
    await expect(revokeMinorSessionsAction(form({ minor_profile_id: "m1" }))).rejects.toThrow("?error=minor");
  });
});
