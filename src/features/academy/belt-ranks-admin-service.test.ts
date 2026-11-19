import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { $id: string };

const store = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, Row>>,
  audit: [] as Array<{ event: string; metadata?: Record<string, unknown> }>,
  writes: [] as Array<{ tableId: string; op: string }>
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/features/auth/service", () => ({
  writeAuditEvent: vi.fn(async (event: string, _actor: string, _type: string, _id: string, metadata?: Record<string, unknown>) => {
    store.audit.push({ event, metadata });
  })
}));
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
        listRows: async ({ tableId }: { tableId: string }) => ({
          rows: Object.values(store.tables[tableId] ?? {}).map((row) => ({ ...row })),
          total: Object.keys(store.tables[tableId] ?? {}).length
        }),
        createRow: async ({ tableId, rowId, data, permissions }: { tableId: string; rowId: string; data: Record<string, unknown>; permissions: string[] }) => {
          store.tables[tableId] ??= {};
          if (store.tables[tableId][rowId]) throw new AppwriteException("exists", 409, "row_already_exists");
          expect(permissions).toEqual([]);
          store.writes.push({ tableId, op: "create" });
          store.tables[tableId][rowId] = { $id: rowId, ...data };
          return { ...store.tables[tableId][rowId] };
        },
        updateRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
          store.writes.push({ tableId, op: "update" });
          store.tables[tableId][rowId] = { ...store.tables[tableId][rowId], ...data };
          return { ...store.tables[tableId][rowId] };
        }
      }
    })
  };
});

import type { Profile } from "@/features/auth/types";
import { applyBeltPreset, saveBeltRanks } from "@/features/academy/config-admin-service";
import { RankInUseError } from "@/features/academy/rank-changes";
import { RankValidationError } from "@/features/academy/rank-schemas";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

const admin = { $id: "p1", account_id: "acc-admin", role: "admin" } as unknown as Profile;
const roles = ["adult_student", "guardian", "minor_student"] as const;
const ranksTable = APPWRITE_IDS.tables.beltRankSettings;

beforeEach(() => {
  store.tables = {};
  store.audit = [];
  store.writes = [];
});

describe("autorização das graduações", () => {
  it.each(roles)("%s recebe admin_required e nada é gravado", async (role) => {
    const actor = { $id: "x", account_id: "acc-x", role } as unknown as Profile;
    await expect(saveBeltRanks(actor, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Laranja" } }])).rejects.toThrow("admin_required");
    await expect(applyBeltPreset(actor, "itf")).rejects.toThrow("admin_required");
    expect(store.tables).toEqual({});
    expect(store.audit).toEqual([]);
  });
});

describe("saveBeltRanks", () => {
  it("cria a linha da graduação, registra a revisão e audita só nomes de campos", async () => {
    const result = await saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Laranja", color_primary: "#f97316", color_style: "solid" } }], "ajuste");
    expect(result).toEqual({ changed: 1 });
    expect(store.tables[ranksTable]["rank-gub-9"]).toMatchObject({
      rank_key: "gub-9",
      display_name: "Laranja",
      color_primary: "#f97316",
      color_style: "solid",
      min_days: 90,
      enabled: true,
      revision: 1,
      updated_by_account_id: "acc-admin"
    });

    const revisions = Object.values(store.tables[APPWRITE_IDS.tables.academyConfigRevisions]);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ scope: "belt_ranks", section: "gub-9", revision: 1, reason: "ajuste", changed_by_account_id: "acc-admin" });

    expect(store.audit).toHaveLength(1);
    expect(store.audit[0].event).toBe("belt_ranks.updated");
    expect(JSON.stringify(store.audit[0].metadata)).toContain("changed_fields");
  });

  it("renomear e recolorir não escreve em alunos, histórico, exames nem matrículas", async () => {
    await saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Laranja", color_primary: "#f97316" } }]);
    const touched = new Set(store.writes.map((write) => write.tableId));
    expect(touched).toEqual(new Set([ranksTable, APPWRITE_IDS.tables.academyConfigRevisions]));
    for (const table of [APPWRITE_IDS.tables.students, APPWRITE_IDS.tables.beltHistory, APPWRITE_IDS.tables.examParticipants, APPWRITE_IDS.tables.enrollments]) {
      expect(touched.has(table)).toBe(false);
    }
  });

  it("não grava nada quando nada mudou", async () => {
    expect(await saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Ponta Amarela" } }])).toEqual({ changed: 0 });
    expect(store.writes).toEqual([]);
    expect(store.audit).toEqual([]);
  });

  it("rejeita revisão antiga e não altera a linha", async () => {
    await saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Laranja" } }]);
    await saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 1, data: { display_name: "Laranja clara" } }]);
    await expect(saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 1, data: { display_name: "Outro" } }])).rejects.toThrow("revision_conflict");
    expect(store.tables[ranksTable]["rank-gub-9"]).toMatchObject({ display_name: "Laranja clara", revision: 2 });
    // Criar de novo com revisão 0 quando a linha já existe também é conflito.
    await expect(saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Mais um" } }])).rejects.toThrow("revision_conflict");
  });

  it("valida no servidor: nome repetido, cor inválida e graduação desconhecida não gravam", async () => {
    await expect(saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { display_name: "Amarela" } }])).rejects.toBeInstanceOf(RankValidationError);
    await expect(saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { color_primary: "x" } }])).rejects.toBeInstanceOf(RankValidationError);
    await expect(saveBeltRanks(admin, [{ rank_key: "xx-1", revision: 0, data: { display_name: "Fantasma" } }])).rejects.toBeInstanceOf(RankValidationError);
    expect(store.tables).toEqual({});
  });

  it("não desativa uma graduação que tem alunos, mas desativa a vazia", async () => {
    store.tables[APPWRITE_IDS.tables.students] = { s1: { $id: "s1", rank_key: "poom-2" }, s2: { $id: "s2", rank_key: "poom-2" } };
    await saveBeltRanks(admin, [{ rank_key: "poom-2", revision: 0, data: { enabled: true } }]);
    const error = await saveBeltRanks(admin, [{ rank_key: "poom-2", revision: 1, data: { enabled: false } }]).catch((caught) => caught);
    expect(error).toBeInstanceOf(RankInUseError);
    expect((error as RankInUseError).ranks).toEqual([{ rank_key: "poom-2", students: 2 }]);
    expect(store.tables[ranksTable]["rank-poom-2"]).toMatchObject({ enabled: true, revision: 1 });

    await saveBeltRanks(admin, [{ rank_key: "poom-3", revision: 0, data: { enabled: true } }]);
    expect(await saveBeltRanks(admin, [{ rank_key: "poom-3", revision: 1, data: { enabled: false } }])).toEqual({ changed: 1 });
    expect(store.tables[ranksTable]["rank-poom-3"]).toMatchObject({ enabled: false, revision: 2 });
  });

  it("tempo, presenças, idade e taxa são gravados por graduação", async () => {
    await saveBeltRanks(admin, [{ rank_key: "dan-1", revision: 0, data: { min_days: 365, min_presences: 100, min_age_years: 15, exam_fee_cents: 30000 } }]);
    expect(store.tables[ranksTable]["rank-dan-1"]).toMatchObject({ min_days: 365, min_presences: 100, min_age_years: 15, exam_fee_cents: 30000 });
  });
});

describe("applyBeltPreset", () => {
  it("muda só nome, cor e forma, ajusta os termos e não toca em tempos, alunos ou histórico", async () => {
    await saveBeltRanks(admin, [{ rank_key: "gub-9", revision: 0, data: { min_days: 15, exam_fee_cents: 9900 } }]);
    store.writes = [];
    const result = await applyBeltPreset(admin, "itf");
    expect(result.preset).toBe("itf");
    expect(result.changed).toBeGreaterThan(5);

    expect(store.tables[ranksTable]["rank-gub-9"]).toMatchObject({
      display_name: "Branca listra Amarela",
      color_style: "stripe",
      form_name: "Chon-Ji",
      min_days: 15,
      exam_fee_cents: 9900,
      revision: 2
    });
    expect(store.tables[ranksTable]["rank-poom-1"]).toBeUndefined();
    const policy = JSON.parse(store.tables[APPWRITE_IDS.tables.academyPolicies]["policy-belts"].data_json as string);
    expect(policy).toEqual({ form_label: "Tul", level_label: "Gup" });

    const touched = new Set(store.writes.map((write) => write.tableId));
    expect(touched.has(APPWRITE_IDS.tables.students)).toBe(false);
    expect(touched.has(APPWRITE_IDS.tables.beltHistory)).toBe(false);
    expect(store.audit.some((entry) => entry.event === "belt_ranks.preset_applied")).toBe(true);
  });

  it("lembra o modelo aplicado na identidade, se ela já foi salva", async () => {
    store.tables[APPWRITE_IDS.tables.academySettings] = { "academy-settings": { $id: "academy-settings", revision: 3, federation: null } };
    await applyBeltPreset(admin, "kukkiwon");
    expect(store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"]).toMatchObject({ federation: "kukkiwon", revision: 4 });
  });

  it("não cria a identidade só para guardar o modelo", async () => {
    await applyBeltPreset(admin, "kukkiwon");
    expect(store.tables[APPWRITE_IDS.tables.academySettings]).toBeUndefined();
  });

  it("modelo desconhecido é recusado", async () => {
    await expect(applyBeltPreset(admin, "outro")).rejects.toThrow("invalid_preset");
  });
});
