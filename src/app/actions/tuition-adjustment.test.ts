import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireProfile: vi.fn(),
  createTuitionAdjustment: vi.fn(),
  applyTuitionAdjustment: vi.fn(),
  cancelTuitionAdjustment: vi.fn(),
  markAdjustmentItemNotified: vi.fn(),
  publishAdjustmentNotice: vi.fn(),
  saveFinanceScenario: vi.fn(),
  deleteFinanceScenario: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireProfile: mocks.requireProfile }));
vi.mock("@/features/billing/adjustment-service", () => ({
  createTuitionAdjustment: mocks.createTuitionAdjustment,
  applyTuitionAdjustment: mocks.applyTuitionAdjustment,
  cancelTuitionAdjustment: mocks.cancelTuitionAdjustment,
  markAdjustmentItemNotified: mocks.markAdjustmentItemNotified,
  publishAdjustmentNotice: mocks.publishAdjustmentNotice
}));
vi.mock("@/features/billing/planning-service", () => ({
  saveFinanceScenario: mocks.saveFinanceScenario,
  deleteFinanceScenario: mocks.deleteFinanceScenario
}));

import {
  applyTuitionAdjustmentAction,
  cancelTuitionAdjustmentAction,
  deleteFinanceScenarioAction,
  markAdjustmentNotifiedAction,
  publishAdjustmentNoticeAction,
  saveFinanceScenarioAction,
  saveTuitionAdjustmentAction
} from "./tuition-adjustment";

const admin = { $id: "p-admin", account_id: "a-admin", role: "admin", capabilities: ["admin"] };

/** Imita o redirect de `requireProfile("admin")` para quem não é administrador. */
function denyNonAdmin() {
  mocks.requireProfile.mockImplementation(async (role?: string) => {
    if (role === "admin") throw new Error("NEXT_REDIRECT");
    return { role: "adult_student" };
  });
}

const calls: Array<[string, () => Promise<unknown>]> = [
  ["saveFinanceScenarioAction", () => saveFinanceScenarioAction({})],
  ["deleteFinanceScenarioAction", () => deleteFinanceScenarioAction("s1")],
  ["saveTuitionAdjustmentAction", () => saveTuitionAdjustmentAction({})],
  ["applyTuitionAdjustmentAction", () => applyTuitionAdjustmentAction("a1")],
  ["cancelTuitionAdjustmentAction", () => cancelTuitionAdjustmentAction("a1")],
  ["markAdjustmentNotifiedAction", () => markAdjustmentNotifiedAction("a1", "e1", true)],
  ["publishAdjustmentNoticeAction", () => publishAdjustmentNoticeAction("a1")]
];

describe("tuition adjustment actions authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(calls)("%s exige perfil admin e não toca nos serviços para aluno ou responsável", async (_name, run) => {
    denyNonAdmin();
    await expect(run()).rejects.toThrow("NEXT_REDIRECT");
    for (const key of ["createTuitionAdjustment", "applyTuitionAdjustment", "cancelTuitionAdjustment", "markAdjustmentItemNotified", "publishAdjustmentNotice", "saveFinanceScenario", "deleteFinanceScenario"] as const) {
      expect(mocks[key]).not.toHaveBeenCalled();
    }
    expect(mocks.requireProfile).toHaveBeenCalledWith("admin");
  });

  it("administrador chega ao serviço com o próprio perfil como ator", async () => {
    mocks.requireProfile.mockResolvedValue(admin);
    mocks.createTuitionAdjustment.mockResolvedValue({ id: "adj-1" });
    await expect(saveTuitionAdjustmentAction({ items: [] })).resolves.toEqual({ ok: true, id: "adj-1" });
    expect(mocks.createTuitionAdjustment).toHaveBeenCalledWith(admin, { items: [] });

    mocks.applyTuitionAdjustment.mockResolvedValue({ status: "applied", applied: 3, skipped: 1 });
    await expect(applyTuitionAdjustmentAction("adj-1")).resolves.toEqual({ ok: true, applied: 3, skipped: 1, alreadyApplied: false });
    expect(mocks.applyTuitionAdjustment).toHaveBeenCalledWith(admin, { adjustmentId: "adj-1" });
  });

  it("devolve mensagem genérica sem vazar detalhes do erro interno", async () => {
    mocks.requireProfile.mockResolvedValue(admin);
    mocks.createTuitionAdjustment.mockRejectedValue(new Error("Appwrite: Joao Silva 11999998888 R$ 150"));
    const result = await saveTuitionAdjustmentAction({});
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(JSON.stringify(result)).not.toMatch(/Joao|11999998888|150/);
  });
});
