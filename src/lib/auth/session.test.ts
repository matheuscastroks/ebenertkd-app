import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeCache } from "@/lib/cache/fake-cache";

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof createFakeCache> | null }));
const mocks = vi.hoisted(() => ({
  accountGet: vi.fn(),
  listRows: vi.fn(),
  getRow: vi.fn(),
  hasSession: true
}));

vi.mock("server-only", () => ({}));
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/cache/cached-read", () => ({ cachedRead: (...args: Parameters<ReturnType<typeof createFakeCache>["cachedRead"]>) => fake.current!.cachedRead(...args) }));
vi.mock("@/lib/appwrite/session", () => ({ createAppwriteSessionClient: async () => (mocks.hasSession ? { account: { get: mocks.accountGet } } : null) }));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: () => ({ tables: { listRows: mocks.listRows, getRow: mocks.getRow }, config: { databaseId: "db" } }) }));

import { getCurrentProfile } from "@/lib/auth/session";
import { resolveStudentProfile } from "@/features/students/access";
import { CACHE_TAGS } from "@/lib/cache/tags";

const profile = (over: Record<string, unknown> = {}) => ({ $id: "p1", account_id: "a1", role: "adult_student", capabilities: ["student"], status: "active", ...over });

beforeEach(() => {
  fake.current = createFakeCache();
  vi.clearAllMocks();
  mocks.hasSession = true;
  mocks.accountGet.mockResolvedValue({ $id: "a1" });
  mocks.listRows.mockResolvedValue({ rows: [profile()] });
});

describe("getCurrentProfile com cache de perfil", () => {
  it("account.get() roda em toda requisição, só a leitura do perfil é cacheada", async () => {
    await getCurrentProfile();
    await getCurrentProfile();
    expect(mocks.accountGet).toHaveBeenCalledTimes(2);
    expect(mocks.listRows).toHaveBeenCalledTimes(1);
  });

  it("sem sessão ou com sessão revogada o perfil em cache não é usado", async () => {
    await getCurrentProfile();
    mocks.accountGet.mockRejectedValue(new Error("401"));
    expect(await getCurrentProfile()).toBeNull();
    mocks.hasSession = false;
    expect(await getCurrentProfile()).toBeNull();
  });

  it("invalidar a tag do perfil faz a próxima leitura ver o status novo", async () => {
    expect(await getCurrentProfile()).toMatchObject({ $id: "p1" });
    mocks.listRows.mockResolvedValue({ rows: [profile({ status: "disabled" })] });
    // Antes da invalidação o status vem do cache; a checagem de status continua fora do cache.
    expect(await getCurrentProfile()).toMatchObject({ $id: "p1" });
    fake.current!.invalidateTags(CACHE_TAGS.profileAccount("a1"));
    expect(await getCurrentProfile()).toBeNull();
  });

  it("perfil com status diferente de active é rejeitado", async () => {
    mocks.listRows.mockResolvedValue({ rows: [profile({ status: "disabled" })] });
    expect(await getCurrentProfile()).toBeNull();
  });

  it("linha de perfil de outra conta nunca é aceita", async () => {
    mocks.listRows.mockResolvedValue({ rows: [profile({ account_id: "outra" })] });
    expect(await getCurrentProfile()).toBeNull();
  });

  it("contas diferentes usam chaves diferentes", async () => {
    await getCurrentProfile();
    mocks.accountGet.mockResolvedValue({ $id: "a2" });
    mocks.listRows.mockResolvedValue({ rows: [profile({ $id: "p2", account_id: "a2" })] });
    expect(await getCurrentProfile()).toMatchObject({ $id: "p2" });
    expect(fake.current!.loads).toHaveLength(2);
  });

  it("invalidar a tag global de perfis derruba todos", async () => {
    await getCurrentProfile();
    fake.current!.invalidateTags(CACHE_TAGS.profiles);
    await getCurrentProfile();
    expect(mocks.listRows).toHaveBeenCalledTimes(2);
  });
});

describe("autorização fora do cache (resolveStudentProfile)", () => {
  const guardian = profile({ $id: "g1", account_id: "ag", role: "adult_student", capabilities: ["guardian"] });
  const minor = profile({ $id: "m1", account_id: "am", role: "minor_student" });

  it("responsável sem vínculo ativo continua barrado mesmo com o perfil do menor em cache", async () => {
    mocks.getRow.mockResolvedValue(minor);
    mocks.listRows.mockResolvedValue({ rows: [{ $id: "link" }] });
    await expect(resolveStudentProfile(guardian as never, "m1")).resolves.toMatchObject({ $id: "m1" });
    expect(fake.current!.loads.some((id) => id.includes("profile-by-id"))).toBe(true);
    // O perfil do menor agora está em cache; o vínculo foi revogado.
    mocks.listRows.mockResolvedValue({ rows: [] });
    await expect(resolveStudentProfile(guardian as never, "m1")).rejects.toThrow("student_access_denied");
    expect(mocks.getRow).toHaveBeenCalledTimes(1);
  });

  it("menor tentando ver outro aluno é barrado sem depender do cache", async () => {
    mocks.getRow.mockResolvedValue(profile({ $id: "outro" }));
    await expect(resolveStudentProfile(minor as never, "outro")).rejects.toThrow("student_access_denied");
  });

  it("o próprio aluno não gera leitura nenhuma de perfil", async () => {
    await expect(resolveStudentProfile(minor as never)).resolves.toMatchObject({ $id: "m1" });
    expect(mocks.getRow).not.toHaveBeenCalled();
  });

  it("administrador acessa qualquer aluno", async () => {
    mocks.getRow.mockResolvedValue(minor);
    await expect(resolveStudentProfile(profile({ $id: "adm", role: "admin", capabilities: [] }) as never, "m1")).resolves.toMatchObject({ $id: "m1" });
  });
});
