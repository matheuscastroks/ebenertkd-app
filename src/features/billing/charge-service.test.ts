import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ rows: {} as Record<string, Record<string, unknown>>, policy: { enrollment_fee_enabled: false, enrollment_fee_cents: 0 } }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (load: () => unknown) => load }));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/features/notifications/notification-service", () => ({ notifyStudentFinancial: vi.fn(async () => undefined) }));
vi.mock("@/features/students/access", () => ({ resolveStudentProfile: vi.fn() }));
vi.mock("@/features/students/service", () => ({ getEnrollmentBundleByStudentId: vi.fn() }));
vi.mock("@/features/academy/config-service", () => ({ getPolicy: vi.fn(async () => store.policy) }));
vi.mock("@/lib/appwrite/server", async () => {
  const { AppwriteException } = await import("node-appwrite");
  return {
    createAppwriteAdminClient: () => ({
      config: { databaseId: "db" },
      tables: {
        createRow: async ({ tableId, rowId, data }: { tableId: string; rowId: string; data: Record<string, unknown> }) => {
          store.rows[tableId] ??= {};
          if (store.rows[tableId][rowId]) throw new AppwriteException("exists", 409, "row_already_exists");
          store.rows[tableId][rowId] = { $id: rowId, ...data };
          return store.rows[tableId][rowId];
        },
        getRow: async ({ tableId, rowId }: { tableId: string; rowId: string }) => store.rows[tableId][rowId]
      }
    })
  };
});

import { createEnrollmentFeeCharge } from "@/features/billing/charge-service";
import type { Enrollment } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

const enrollment = { $id: "enr-1", student_id: "stu-1", first_due_date: "2026-12-10T12:00:00.000Z" } as unknown as Enrollment;
const charges = () => Object.values(store.rows[APPWRITE_IDS.tables.charges] ?? {});

beforeEach(() => {
  store.rows = {};
  store.policy = { enrollment_fee_enabled: false, enrollment_fee_cents: 0 };
});

describe("taxa de matrícula (B3)", () => {
  it("desativada por padrão: não gera cobrança", async () => {
    expect(await createEnrollmentFeeCharge(enrollment)).toBeNull();
    expect(charges()).toHaveLength(0);
  });

  it("habilitada: gera uma cobrança enrollment_fee com o valor da política", async () => {
    store.policy = { enrollment_fee_enabled: true, enrollment_fee_cents: 8000 };
    await createEnrollmentFeeCharge(enrollment);
    expect(charges()).toHaveLength(1);
    expect(charges()[0]).toMatchObject({ charge_type: "enrollment_fee", amount_cents: 8000, status: "pending", enrollment_id: "enr-1", competence: "2026-12" });
  });

  it("é idempotente: repetir a aprovação não duplica nem muda o valor já cobrado", async () => {
    store.policy = { enrollment_fee_enabled: true, enrollment_fee_cents: 8000 };
    const first = await createEnrollmentFeeCharge(enrollment);
    store.policy = { enrollment_fee_enabled: true, enrollment_fee_cents: 9500 };
    const second = await createEnrollmentFeeCharge(enrollment);
    expect(charges()).toHaveLength(1);
    expect(second).toMatchObject({ $id: (first as { $id: string }).$id, amount_cents: 8000 });
  });
});
