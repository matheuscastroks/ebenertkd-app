import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
const session = vi.hoisted(() => ({ requireProfile: vi.fn() }));
vi.mock("@/lib/auth/session", () => session);
const services = vi.hoisted(() => ({
  saveBeltRanks: vi.fn(),
  applyBeltPreset: vi.fn(),
  savePolicySection: vi.fn(),
  saveAcademyIdentity: vi.fn(),
  previewEligibilityImpact: vi.fn()
}));
vi.mock("@/features/academy/config-admin-service", () => ({
  saveBeltRanks: services.saveBeltRanks,
  applyBeltPreset: services.applyBeltPreset,
  savePolicySection: services.savePolicySection,
  saveAcademyIdentity: services.saveAcademyIdentity
}));
vi.mock("@/features/academy/impact-service", () => ({
  previewAccessImpact: vi.fn(),
  previewEligibilityImpact: services.previewEligibilityImpact
}));

import {
  applyBeltPresetAction,
  previewExamImpactAction,
  previewRankImpactAction,
  saveBeltRanksAction,
  saveBeltsPolicyAction,
  saveExamPolicyAction
} from "@/app/actions/academy-settings";
import { RankInUseError } from "@/features/academy/rank-changes";
import { RankValidationError } from "@/features/academy/rank-schemas";

const admin = { $id: "p1", account_id: "acc", role: "admin" };
const patches = [{ rank_key: "gub-9", revision: 0, data: { display_name: "Laranja" } }];
const form = (data: Record<string, string>) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) formData.set(key, value);
  return formData;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  session.requireProfile.mockResolvedValue(admin);
});

describe("ações de graduações e exames exigem o administrador", () => {
  it("aluno, responsável e menor são barrados antes de qualquer serviço", async () => {
    session.requireProfile.mockRejectedValue(new Error("admin_required"));
    await expect(saveBeltRanksAction(patches)).rejects.toThrow("admin_required");
    await expect(applyBeltPresetAction("itf")).rejects.toThrow("admin_required");
    await expect(previewRankImpactAction(patches)).rejects.toThrow("admin_required");
    await expect(saveExamPolicyAction(form({ revision: "0" }))).rejects.toThrow("admin_required");
    await expect(saveBeltsPolicyAction(form({ revision: "0" }))).rejects.toThrow("admin_required");
    await expect(previewExamImpactAction(form({}))).rejects.toThrow("admin_required");
    for (const mock of Object.values(services)) expect(mock).not.toHaveBeenCalled();
    expect(session.requireProfile).toHaveBeenCalledWith("admin");
  });
});

describe("saveBeltRanksAction", () => {
  it("repassa as alterações e o motivo ao serviço", async () => {
    services.saveBeltRanks.mockResolvedValue({ changed: 1 });
    expect(await saveBeltRanksAction(patches, " ajuste ")).toEqual({ ok: true, changed: 1 });
    expect(services.saveBeltRanks).toHaveBeenCalledWith(admin, patches, "ajuste");
  });

  it("traduz conflito, validação e graduação em uso sem vazar detalhes", async () => {
    services.saveBeltRanks.mockRejectedValueOnce(new Error("revision_conflict"));
    expect(await saveBeltRanksAction(patches)).toEqual({ ok: false, error: "revision_conflict" });

    services.saveBeltRanks.mockRejectedValueOnce(new RankValidationError([{ field: "display_name", rank_key: "gub-9", message: "Informe o nome da faixa" }]));
    expect(await saveBeltRanksAction(patches)).toEqual({ ok: false, error: "invalid", fields: { "gub-9.display_name": "Informe o nome da faixa" } });

    services.saveBeltRanks.mockRejectedValueOnce(new RankInUseError([{ rank_key: "gub-5", students: 3 }]));
    expect(await saveBeltRanksAction(patches)).toEqual({ ok: false, error: "rank_in_use", inUse: ["gub-5"] });

    services.saveBeltRanks.mockRejectedValueOnce(new Error("token=segredo"));
    expect(await saveBeltRanksAction(patches)).toEqual({ ok: false, error: "failed" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("segredo");
  });
});

describe("modelo e impacto", () => {
  it("aplicar modelo chama o serviço com o id", async () => {
    services.applyBeltPreset.mockResolvedValue({ changed: 12, preset: "itf" });
    expect(await applyBeltPresetAction("itf")).toEqual({ ok: true, changed: 12 });
    expect(services.applyBeltPreset).toHaveBeenCalledWith(admin, "itf");
  });

  it("o impacto vem do serviço; falha vira ok:false", async () => {
    services.previewEligibilityImpact.mockResolvedValueOnce({ total: 10, leaving: 2, entering: 1 });
    expect(await previewRankImpactAction(patches)).toEqual({ ok: true, impact: { total: 10, leaving: 2, entering: 1 } });
    services.previewEligibilityImpact.mockRejectedValueOnce(new Error("boom"));
    expect(await previewRankImpactAction(patches)).toEqual({ ok: false });
  });

  it("a política de exame traduz o formulário (taxa vazia vira null, switches e decisão)", async () => {
    services.savePolicySection.mockResolvedValue({ revision: 2 });
    const result = await saveExamPolicyAction(
      form({ revision: "1", default_fee: "", almost_ready_pct: "80", fallback_min_days: "60", fallback_min_presences: "12", block_on_overdue: "on", absent_default_decision: "none" })
    );
    expect(result).toEqual({ ok: true, revision: 2 });
    expect(services.savePolicySection).toHaveBeenCalledWith(
      admin,
      "exam",
      { default_fee_cents: null, block_on_overdue: true, almost_ready_pct: 80, fallback_min_days: 60, fallback_min_presences: 12, allow_skip_grades: false, absent_default_decision: null },
      1,
      undefined
    );
  });
});
