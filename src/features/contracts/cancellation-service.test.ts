import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/features/auth/service", () => ({ writeAuditEvent: vi.fn() }));

const calls: string[] = [];
const tables = {
  getRow: vi.fn(),
  updateRow: vi.fn(async ({ tableId }: { tableId: string }) => { calls.push(`update:${tableId}`); return {}; }),
};
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: vi.fn(() => ({ tables, config: { databaseId: "db" } })) }));
const applyApproved = vi.hoisted(() => vi.fn());
vi.mock("@/features/billing/charge-service", () => ({ applyApprovedCancellation: applyApproved }));
vi.mock("@/features/contracts/contract-service", () => ({ getContractForActor: vi.fn() }));

import { decideCancellation } from "./cancellation-service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import type { Profile } from "@/features/auth/types";

const admin = { $id: "a", role: "admin", account_id: "acc" } as Profile;
const input = { requestId: "r1", decision: "approved", feeCents: 0, notes: "ok ok" };

describe("decideCancellation", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
    tables.getRow.mockResolvedValue({ $id: "r1", status: "pending", contract_id: "c1", enrollment_id: "e1" });
  });

  it("recusa quem não é admin antes de consultar o banco", async () => {
    const student = { $id: "s", role: "adult_student" } as Profile;
    await expect(decideCancellation(student, input)).rejects.toThrow("admin_required");
    expect(tables.getRow).not.toHaveBeenCalled();
  });

  it("só marca o pedido como aprovado depois de aplicar cobranças, contrato e matrícula", async () => {
    applyApproved.mockImplementation(async () => { calls.push("apply"); });
    await decideCancellation(admin, input);
    expect(calls.at(-1)).toBe(`update:${APPWRITE_IDS.tables.cancellationRequests}`);
    expect(calls[0]).toBe("apply");
  });

  it("mantém o pedido pendente se aplicar os efeitos falhar, permitindo repetir", async () => {
    applyApproved.mockRejectedValue(new Error("falha"));
    await expect(decideCancellation(admin, input)).rejects.toThrow("falha");
    expect(calls).not.toContain(`update:${APPWRITE_IDS.tables.cancellationRequests}`);
  });
});
