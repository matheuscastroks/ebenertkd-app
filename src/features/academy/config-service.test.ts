import { beforeEach, describe, expect, it, vi } from "vitest";

const listRows = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (load: () => unknown) => load }));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: () => ({ config: { databaseId: "db" }, tables: { listRows } }) }));

import { getAcademyIdentity, getAcademyPolicies, getBeltContext, getBeltRanks, getBeltRanksForEdit, getPolicy, getPolicyForEdit } from "@/features/academy/config-service";
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

describe("leitura das graduações", () => {
  const byTable = (rows: Record<string, unknown[]>) =>
    listRows.mockImplementation(async ({ tableId }: { tableId: string }) => ({ rows: rows[tableId] ?? [] }));

  it("sem linhas, as 23 graduações usam os padrões do código", async () => {
    byTable({});
    const ranks = await getBeltRanks();
    expect(ranks).toHaveLength(23);
    expect(ranks.every((rank) => !rank.configured)).toBe(true);
    expect(ranks[1]).toMatchObject({ rank_key: "gub-9", display_name: "Ponta Amarela", min_days: 90 });
  });

  it("falha do Appwrite devolve os padrões sem lançar", async () => {
    listRows.mockRejectedValue(new Error("fetch failed"));
    expect(await getBeltRanks()).toHaveLength(23);
    expect(await getBeltContext()).toMatchObject({ formLabel: "Poomsae", levelLabel: "Gub" });
  });

  it("o contexto público traz nome e cor configurados e os termos da federação, sem requisitos", async () => {
    byTable({
      belt_rank_settings: [{ rank_key: "gub-9", display_name: "Laranja", color_primary: "#f97316", color_style: "solid", min_days: 15, revision: 2 }],
      academy_policies: [{ section: "belts", schema_version: 1, data_json: JSON.stringify({ form_label: "Tul", level_label: "Gup" }), revision: 1 }]
    });
    const context = await getBeltContext();
    expect(context).toMatchObject({ formLabel: "Tul", levelLabel: "Gup" });
    const gub9 = context.ranks.find((rank) => rank.rank_key === "gub-9")!;
    expect(gub9).toMatchObject({ display_name: "Laranja", color_primary: "#f97316", color_style: "solid", enabled: true });
    expect(gub9).not.toHaveProperty("min_days");
    expect(context.ranks).toHaveLength(23);
  });

  it("a tela de edição recebe as revisões de cada graduação", async () => {
    byTable({ belt_rank_settings: [{ rank_key: "gub-9", display_name: "Laranja", revision: 5 }] });
    const { ranks, beltsRevision } = await getBeltRanksForEdit();
    expect(ranks.find((rank) => rank.rank_key === "gub-9")).toMatchObject({ revision: 5, configured: true });
    expect(ranks.find((rank) => rank.rank_key === "gub-8")).toMatchObject({ revision: 0, configured: false });
    expect(beltsRevision).toBe(0);
  });
});
