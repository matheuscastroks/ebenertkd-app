import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { $id: string };

const store = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, Row>>, audit: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn(async (event: string) => { store.audit.push(event); }) }));
vi.mock("@/lib/appwrite/server", async () => {
  const { AppwriteException } = await import("node-appwrite");
  return {
    createAppwriteAdminClient: () => ({
      config: { databaseId: "db" },
      tables: {
        getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
          const row = store.tables[tableId]?.[rowId];
          if (!row) throw new AppwriteException("not found", 404, "row_not_found");
          return { ...row };
        },
        listRows: async ({ tableId }: { tableId: string }) => ({ rows: Object.values(store.tables[tableId] ?? {}).map((row) => ({ ...row })) }),
        createRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
          store.tables[tableId] ??= {};
          if (store.tables[tableId][rowId]) throw new AppwriteException("exists", 409, "row_already_exists");
          store.tables[tableId][rowId] = { $id: rowId, ...data };
          return { ...store.tables[tableId][rowId] };
        },
        updateRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
          store.tables[tableId][rowId] = { ...store.tables[tableId][rowId], ...data };
          return { ...store.tables[tableId][rowId] };
        }
      }
    })
  };
});

import type { Profile } from "@/features/auth/types";
import { completeSetup, listConfigRevisionRows, restoreConfigRevision, saveAcademyIdentity, savePolicySection } from "@/features/academy/config-admin-service";
import { buildHistory, diffRevision } from "@/features/academy/history-rules";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

const admin = { $id: "p1", account_id: "acc-admin", role: "admin" } as unknown as Profile;
const revisions = () => Object.values(store.tables[APPWRITE_IDS.tables.academyConfigRevisions] ?? {});
const revisionRow = (scope: string, section: string, revision: number) => revisions().find((row) => row.scope === scope && row.section === section && row.revision === revision)!;
const identity = { legal_name: "Academia Dragão Ltda", display_name: "Dragão TKD", short_name: "Dragão", professor_name: "Kim" };

beforeEach(() => {
  store.tables = {};
  store.audit = [];
});

describe("restaurar uma versão do histórico", () => {
  it.each(["adult_student", "guardian", "minor_student"] as const)("%s recebe admin_required", async (role) => {
    const actor = { $id: "x", account_id: "a", role } as unknown as Profile;
    await expect(restoreConfigRevision(actor, "any", 0)).rejects.toThrow("admin_required");
    await expect(completeSetup(actor)).rejects.toThrow("admin_required");
  });

  it("política: cria uma NOVA revisão com os valores da versão escolhida", async () => {
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 18000 }, 0);
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 20000 }, 1);
    const target = revisionRow("policy", "billing", 1);

    const restored = await restoreConfigRevision(admin, target.$id, 2);
    expect(restored).toMatchObject({ scope: "policy", section: "billing", revision: 3 });
    const row = store.tables[APPWRITE_IDS.tables.academyPolicies]["policy-billing"];
    expect(JSON.parse(row.data_json as string).default_monthly_fee_cents).toBe(18000);
    expect(row.revision).toBe(3);
    expect(revisions()).toHaveLength(3);
    expect(revisionRow("policy", "billing", 3)).toMatchObject({ reason: "Restaurada a versão 1" });
    expect(revisionRow("policy", "billing", 1)).toEqual(target);
  });

  it("respeita a concorrência: revisão desatualizada falha sem gravar", async () => {
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 18000 }, 0);
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 20000 }, 1);
    const target = revisionRow("policy", "billing", 1);
    await expect(restoreConfigRevision(admin, target.$id, 1)).rejects.toThrow("revision_conflict");
    expect(revisions()).toHaveLength(2);
    expect(JSON.parse(store.tables[APPWRITE_IDS.tables.academyPolicies]["policy-billing"].data_json as string).default_monthly_fee_cents).toBe(20000);
  });

  it("identidade: restaura os campos e gera nova revisão", async () => {
    await saveAcademyIdentity(admin, identity, 0);
    await saveAcademyIdentity(admin, { ...identity, short_name: "Outro nome" }, 1);
    await restoreConfigRevision(admin, revisionRow("settings", "identity", 1).$id, 2);
    expect(store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"]).toMatchObject({ short_name: "Dragão", revision: 3 });
    expect(revisions()).toHaveLength(3);
  });

  it("revisão inexistente é recusada", async () => {
    await expect(restoreConfigRevision(admin, "nao-existe", 0)).rejects.toThrow("revision_not_found");
  });
});

describe("assistente de primeiros passos", () => {
  it("só conclui depois de salvar a identidade, e uma vez só", async () => {
    await expect(completeSetup(admin)).rejects.toThrow("identity_required");
    await saveAcademyIdentity(admin, identity, 0);
    const done = await completeSetup(admin);
    expect(done.revision).toBe(2);
    expect(store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"].setup_completed_at).toBeTruthy();
    expect((await completeSetup(admin)).revision).toBe(2);
    expect(store.audit).toContain("academy.setup.completed");
  });
});

describe("histórico e diferença", () => {
  it("monta a linha do tempo marcando a versão em vigor, sem JSON bruto", async () => {
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 18000 }, 0);
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 20000 }, 1);
    const entries = buildHistory(await listConfigRevisionRows(admin));
    expect(entries).toHaveLength(2);
    const current = entries.find((entry) => entry.revision === 2)!;
    expect(current).toMatchObject({ isCurrent: true, latestRevision: 2, sectionLabel: "Financeiro" });
    expect(current.diff).toHaveLength(1);
    expect(current.diff[0]).toMatchObject({ field: "default_monthly_fee_cents", label: "Mensalidade padrão" });
    expect(current.diff[0].before).toContain("180,00");
    expect(current.diff[0].after).toContain("200,00");
    expect(entries.find((entry) => entry.revision === 1)?.isCurrent).toBe(false);
    expect(JSON.stringify(entries)).not.toContain("before_json");
  });

  it("não mostra dados de contato, documento nem professor da identidade", () => {
    const diff = diffRevision("settings", { short_name: "A", document_number: "11222333000181", professor_name: "Kim", phone_whatsapp: null }, { short_name: "B", document_number: "99999999000191", professor_name: "Lee", phone_whatsapp: "11999990000" });
    expect(diff.find((row) => row.field === "short_name")).toMatchObject({ before: "A", after: "B" });
    const text = JSON.stringify(diff);
    for (const secret of ["11222333000181", "99999999000191", "Kim", "Lee", "11999990000"]) expect(text).not.toContain(secret);
    expect(diff.find((row) => row.field === "phone_whatsapp")).toMatchObject({ before: "Vazio", after: "Alterado" });
  });

  it("formata listas e conquistas", () => {
    const diff = diffRevision("policy", { due_day_options: [5, 10] }, { due_day_options: [10] });
    expect(diff[0]).toMatchObject({ before: "5, 10", after: "10" });
    expect(diffRevision("policy", { badges: [] }, { badges: [{ title: "Dez treinos", target: 10 }] })[0].after).toContain("Dez treinos (meta 10)");
  });
});
