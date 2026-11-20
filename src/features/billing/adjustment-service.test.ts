import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { $id: string };

const store = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, Row>>,
  updates: [] as Array<{ table: string; id: string; data: Record<string, unknown> }>,
  audit: [] as Array<{ event: string; metadata?: Record<string, unknown> }>
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/features/notifications/notification-service", () => ({ publishAnnouncement: vi.fn() }));
vi.mock("@/features/classes/service", () => ({ listTrainingClasses: vi.fn(async () => []) }));
vi.mock("@/features/auth/service", () => ({
  writeAuditEvent: vi.fn(async (event: string, _actor: string, _type: string, _id: string, metadata?: Record<string, unknown>) => {
    store.audit.push({ event, metadata });
  })
}));
vi.mock("@/lib/appwrite/all-rows", () => ({
  listAllRows: vi.fn(async (table: string, queries: unknown[] = []) => {
    void queries;
    return Object.values(store.rows[table] ?? {});
  })
}));
vi.mock("@/lib/appwrite/server", () => ({
  createAppwriteAdminClient: () => ({
    config: { databaseId: "db" },
    tables: {
      getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => {
        const row = store.rows[tableId]?.[rowId];
        if (!row) throw new Error("not_found");
        return { ...row };
      },
      updateRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
        store.updates.push({ table: tableId, id: rowId, data });
        store.rows[tableId][rowId] = { ...store.rows[tableId][rowId], ...data };
        return store.rows[tableId][rowId];
      },
      listRows: async () => ({ rows: [] })
    }
  })
}));

import type { Profile } from "@/features/auth/types";
import { applyTuitionAdjustment, createTuitionAdjustment, markAdjustmentItemNotified, publishAdjustmentNotice } from "./adjustment-service";

const admin = { $id: "p1", account_id: "acc-admin", role: "admin" } as unknown as Profile;
const student = { $id: "p2", account_id: "acc-student", role: "adult_student" } as unknown as Profile;
const guardian = { $id: "p3", account_id: "acc-guardian", role: "guardian" } as unknown as Profile;

function seed() {
  store.rows = {
    tuition_adjustments: { adj1: { $id: "adj1", status: "draft", effective_from: "2027-01-01T12:00:00.000Z" } },
    tuition_adjustment_items: {
      i1: { $id: "i1", adjustment_id: "adj1", enrollment_id: "e1", student_id: "s1", previous_fee_cents: 10_000, new_fee_cents: 10_500, excluded: false },
      i2: { $id: "i2", adjustment_id: "adj1", enrollment_id: "e2", student_id: "s2", previous_fee_cents: 12_000, new_fee_cents: 12_600, excluded: false },
      i3: { $id: "i3", adjustment_id: "adj1", enrollment_id: "e3", student_id: "s3", previous_fee_cents: 9_000, new_fee_cents: 9_900, excluded: true },
      i4: { $id: "i4", adjustment_id: "adj1", enrollment_id: "e4", student_id: "s4", previous_fee_cents: 8_000, new_fee_cents: 8_400, excluded: false }
    },
    enrollments: {
      e1: { $id: "e1", monthly_fee_cents: 10_000 },
      e2: { $id: "e2", monthly_fee_cents: 12_000 },
      e3: { $id: "e3", monthly_fee_cents: 9_000 },
      // mensalidade alterada manualmente depois da simulação
      e4: { $id: "e4", monthly_fee_cents: 8_200 }
    }
  };
  store.updates = [];
  store.audit = [];
}

describe("adjustment service", () => {
  beforeEach(seed);

  it.each([["aluno", student], ["responsável", guardian]])("recusa %s em todas as operações de escrita", async (_label, actor) => {
    await expect(createTuitionAdjustment(actor, {})).rejects.toThrow("admin_required");
    await expect(applyTuitionAdjustment(actor, { adjustmentId: "adj1" })).rejects.toThrow("admin_required");
    await expect(markAdjustmentItemNotified(actor, { adjustmentId: "adj1", enrollmentId: "e1", notified: true })).rejects.toThrow("admin_required");
    await expect(publishAdjustmentNotice(actor, { adjustmentId: "adj1" })).rejects.toThrow("admin_required");
    expect(store.updates).toEqual([]);
  });

  it("valida a entrada com zod antes de qualquer gravação", async () => {
    await expect(createTuitionAdjustment(admin, { mode: "percent", items: [] })).rejects.toThrow();
    expect(store.updates).toEqual([]);
  });

  it("aplica só o novo valor das matrículas, sem tocar em contratos ou cobranças, e audita sem valores individuais", async () => {
    const result = await applyTuitionAdjustment(admin, { adjustmentId: "adj1" });
    expect(result).toEqual({ status: "applied", applied: 2, skipped: 1 });
    expect(store.rows.enrollments.e1.monthly_fee_cents).toBe(10_500);
    expect(store.rows.enrollments.e2.monthly_fee_cents).toBe(12_600);
    expect(store.rows.enrollments.e3.monthly_fee_cents).toBe(9_000);
    expect(store.rows.enrollments.e4.monthly_fee_cents).toBe(8_200);
    expect(new Set(store.updates.map((update) => update.table))).toEqual(new Set(["enrollments", "tuition_adjustment_items", "tuition_adjustments"]));
    expect(store.rows.tuition_adjustments.adj1.status).toBe("applied");
    expect(store.audit).toEqual([{ event: "tuition.adjustment.applied", metadata: { applied: 2, skipped: 1 } }]);
  });

  it("é idempotente: aplicar de novo não regrava matrículas nem duplica auditoria", async () => {
    await applyTuitionAdjustment(admin, { adjustmentId: "adj1" });
    const updatesAfterFirst = store.updates.length;
    const second = await applyTuitionAdjustment(admin, { adjustmentId: "adj1" });
    expect(second).toEqual({ status: "already_applied", applied: 0, skipped: 0 });
    expect(store.updates).toHaveLength(updatesAfterFirst);
    expect(store.audit).toHaveLength(1);
  });

  it("retoma uma aplicação interrompida sem regravar itens já aplicados", async () => {
    store.rows.tuition_adjustment_items.i1.applied_at = "2026-11-18T10:00:00.000Z";
    store.rows.enrollments.e1.monthly_fee_cents = 10_500;
    const result = await applyTuitionAdjustment(admin, { adjustmentId: "adj1" });
    expect(result.applied).toBe(1);
    expect(store.updates.filter((update) => update.table === "enrollments").map((update) => update.id)).toEqual(["e2"]);
  });

  it("não aplica campanha cancelada", async () => {
    store.rows.tuition_adjustments.adj1.status = "cancelled";
    await expect(applyTuitionAdjustment(admin, { adjustmentId: "adj1" })).rejects.toThrow("adjustment_not_applicable");
    expect(store.updates).toEqual([]);
  });

  it("publica o aviso geral uma única vez", async () => {
    await publishAdjustmentNotice(admin, { adjustmentId: "adj1" });
    expect(store.rows.tuition_adjustments.adj1.notice_published_at).toBeTruthy();
    await expect(publishAdjustmentNotice(admin, { adjustmentId: "adj1" })).rejects.toThrow("notice_already_published");
  });
});
