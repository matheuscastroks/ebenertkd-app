import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { $id: string };

const store = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, Row>>,
  audit: [] as Array<{ event: string; metadata?: Record<string, unknown> }>
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
        createRow: async ({ tableId, rowId, data, permissions }: { tableId: string; rowId: string; data: Record<string, unknown>; permissions: string[] }) => {
          store.tables[tableId] ??= {};
          if (store.tables[tableId][rowId]) throw new AppwriteException("exists", 409, "row_already_exists");
          expect(permissions).toEqual([]);
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
import { saveAcademyIdentity, savePolicySection } from "@/features/academy/config-admin-service";
import { PolicyValidationError } from "@/features/academy/schemas";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

const admin = { $id: "p1", account_id: "acc-admin", role: "admin" } as unknown as Profile;
const roles = ["adult_student", "guardian", "minor_student"] as const;
const identity = { legal_name: "Academia Dragão Ltda", display_name: "Dragão TKD", short_name: "Dragão", document_type: "cnpj", document_number: "11.222.333/0001-81", professor_name: "Kim" };

beforeEach(() => {
  store.tables = {};
  store.audit = [];
});

describe("autorização das gravações de configuração", () => {
  it.each(roles)("%s recebe admin_required e nada é gravado", async (role) => {
    const actor = { $id: "x", account_id: "acc-x", role } as unknown as Profile;
    await expect(saveAcademyIdentity(actor, identity, 0)).rejects.toThrow("admin_required");
    await expect(savePolicySection(actor, "billing", {}, 0)).rejects.toThrow("admin_required");
    expect(store.tables).toEqual({});
    expect(store.audit).toEqual([]);
  });
});

describe("saveAcademyIdentity", () => {
  it("cria a linha na revisão 1, registra a revisão e audita sem dados pessoais", async () => {
    const saved = await saveAcademyIdentity(admin, identity, 0, "primeiro cadastro");
    expect(saved.revision).toBe(1);
    expect(store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"]).toMatchObject({ short_name: "Dragão", document_number: "11222333000181", revision: 1, updated_by_account_id: "acc-admin" });

    const revisions = Object.values(store.tables[APPWRITE_IDS.tables.academyConfigRevisions]);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toMatchObject({ scope: "settings", section: "identity", revision: 1, reason: "primeiro cadastro", changed_by_account_id: "acc-admin" });

    expect(store.audit).toHaveLength(1);
    expect(store.audit[0].event).toBe("academy.settings.updated");
    const metadata = JSON.stringify(store.audit[0].metadata);
    expect(metadata).toContain("changed_fields");
    expect(metadata).not.toContain("11222333000181");
    expect(metadata).not.toContain("Kim");
  });

  it("rejeita revisão antiga (conflito) sem alterar nada", async () => {
    await saveAcademyIdentity(admin, identity, 0);
    await saveAcademyIdentity(admin, { ...identity, short_name: "Dragão 2" }, 1);
    await expect(saveAcademyIdentity(admin, { ...identity, short_name: "Outro" }, 1)).rejects.toThrow("revision_conflict");
    expect(store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"]).toMatchObject({ short_name: "Dragão 2", revision: 2 });
    // Criar de novo com revisão 0 quando já existe também é conflito.
    await expect(saveAcademyIdentity(admin, identity, 0)).rejects.toThrow("revision_conflict");
  });

  it("valida CNPJ no servidor", async () => {
    await expect(saveAcademyIdentity(admin, { ...identity, document_number: "11222333000182" }, 0)).rejects.toThrow();
    expect(store.tables).toEqual({});
  });

  it("preserva campos que a tela não edita (federação, logo)", async () => {
    await saveAcademyIdentity(admin, identity, 0);
    store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"].federation = "itf";
    store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"].logo_file_id = "logo-1";
    await saveAcademyIdentity(admin, { ...identity, short_name: "Novo nome" }, 1);
    expect(store.tables[APPWRITE_IDS.tables.academySettings]["academy-settings"]).toMatchObject({ federation: "itf", logo_file_id: "logo-1", short_name: "Novo nome" });
  });
});

describe("savePolicySection", () => {
  it("grava com defaults, versiona e registra antes/depois", async () => {
    const first = await savePolicySection(admin, "access", { window_days: 45 }, 0);
    expect(first).toEqual({ policy: { enabled: true, window_days: 45, warning_days: 5 }, revision: 1 });
    await savePolicySection(admin, "access", { enabled: false }, 1);
    const row = store.tables[APPWRITE_IDS.tables.academyPolicies]["policy-access"];
    expect(JSON.parse(row.data_json as string)).toEqual({ enabled: false, window_days: 45, warning_days: 5 });
    expect(row).toMatchObject({ section: "access", schema_version: 1, revision: 2 });
    const revisions = Object.values(store.tables[APPWRITE_IDS.tables.academyConfigRevisions]).sort((a, b) => Number(a.revision) - Number(b.revision));
    expect(revisions.map((item) => item.revision)).toEqual([1, 2]);
    expect(JSON.parse(revisions[1].before_json as string).window_days).toBe(45);
    expect(store.audit.map((item) => item.event)).toEqual(["academy.policy.updated", "academy.policy.updated"]);
  });

  it("conflito de revisão e validação não gravam", async () => {
    await savePolicySection(admin, "billing", { default_monthly_fee_cents: 16000 }, 0);
    await expect(savePolicySection(admin, "billing", { default_monthly_fee_cents: 17000 }, 0)).rejects.toThrow("revision_conflict");
    await expect(savePolicySection(admin, "billing", { due_day_options: [1] }, 1)).rejects.toThrow(PolicyValidationError);
    expect(JSON.parse(store.tables[APPWRITE_IDS.tables.academyPolicies]["policy-billing"].data_json as string).default_monthly_fee_cents).toBe(16000);
  });

  it("seção desconhecida é recusada", async () => {
    await expect(savePolicySection(admin, "retention" as never, {}, 0)).rejects.toThrow("invalid_policy_section");
  });
});
