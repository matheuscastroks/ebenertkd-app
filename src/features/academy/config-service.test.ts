import { beforeEach, describe, expect, it, vi } from "vitest";

const listRows = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (load: () => unknown) => load }));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: () => ({ config: { databaseId: "db" }, tables: { listRows } }) }));

import { getAcademyIdentity, getAcademyPolicies, getPolicy, getPolicyForEdit } from "@/features/academy/config-service";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_POLICIES } from "@/features/academy/defaults";

beforeEach(() => {
  listRows.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("leitura da configuração: o app sempre renderiza", () => {
  it("sem linhas, devolve os defaults atuais", async () => {
    listRows.mockResolvedValue({ rows: [] });
    expect(await getAcademyIdentity()).toMatchObject({ ...DEFAULT_ACADEMY_IDENTITY, configured: false, revision: 0 });
    expect(await getAcademyPolicies()).toEqual(DEFAULT_POLICIES);
  });

  it("falha do Appwrite devolve defaults sem lançar e sem logar conteúdo", async () => {
    listRows.mockRejectedValue(new Error("fetch failed token=segredo123"));
    expect(await getAcademyIdentity()).toMatchObject({ short_name: "Ebener TKD", configured: false });
    expect(await getPolicy("billing")).toEqual(DEFAULT_POLICIES.billing);
    expect(await getPolicyForEdit("access")).toEqual({ policy: DEFAULT_POLICIES.access, revision: 0 });
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("segredo123");
  });

  it("linha com JSON inválido mantém o padrão; linha válida vale", async () => {
    listRows.mockResolvedValue({
      rows: [
        { section: "billing", schema_version: 1, data_json: "{quebrado", revision: 3 },
        { section: "access", schema_version: 1, data_json: JSON.stringify({ enabled: false, window_days: 60, warning_days: 5 }), revision: 2 }
      ]
    });
    const policies = await getAcademyPolicies();
    expect(policies.billing).toEqual(DEFAULT_POLICIES.billing);
    expect(policies.access).toEqual({ enabled: false, window_days: 60, warning_days: 5 });
    expect(await getPolicyForEdit("access")).toMatchObject({ revision: 2 });
  });

  it("identidade salva substitui só os campos preenchidos", async () => {
    listRows.mockResolvedValue({ rows: [{ $id: "academy-settings", legal_name: "Dragão Ltda", display_name: "", short_name: "Dragão", theme_color: "inválida", timezone: "UTC", revision: 4 }] });
    const identity = await getAcademyIdentity();
    expect(identity).toMatchObject({ legal_name: "Dragão Ltda", display_name: "Ebener Taekwondo", short_name: "Dragão", theme_color: "#f59300", timezone: "America/Sao_Paulo", configured: true, revision: 4 });
  });
});
