import { describe, expect, it } from "vitest";
import { resolveRankConfigs, type RankConfig } from "@/features/academy/belt-rules";
import { BELT_PRESETS, findBeltPreset } from "@/features/academy/presets";
import { diffPreset, presetToPatches } from "@/features/academy/preset-rules";
import { applyRankChanges, countStudentsByRank, disabledRanksInUse, planRankChanges } from "@/features/academy/rank-changes";
import { buildRankPatches, patchesAffectEligibility, rankDraftToData, toRankDraft } from "@/features/academy/rank-form";
import { RANK_KEYS } from "@/features/academy/ranks";

const configs = resolveRankConfigs(null);
const get = (list: readonly RankConfig[], key: string) => list.find((config) => config.rank_key === key)!;

describe("planRankChanges", () => {
  it("só devolve o que realmente muda e valida cada campo", () => {
    const { changes, issues } = planRankChanges(configs, [
      { rank_key: "gub-9", revision: 0, data: { display_name: "Laranja", color_primary: "#F97316", color_style: "solid" } },
      { rank_key: "gub-8", revision: 0, data: { display_name: "Amarela" } } // igual ao atual
    ]);
    expect(issues).toEqual([]);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ rank_key: "gub-9", revision: 0 });
    expect(changes[0].changedFields).toEqual(["display_name", "color_primary", "color_style"]);
    expect(changes[0].after.color_primary).toBe("#f97316");
  });

  it("renomear ou recolorir muda só a configuração da graduação (requisitos e habilitação intactos)", () => {
    const { changes } = planRankChanges(configs, [{ rank_key: "gub-6", revision: 0, data: { display_name: "Roxa", color_primary: "#7c3aed" } }]);
    const [change] = changes;
    expect(change.after.min_days).toBe(get(configs, "gub-6").min_days);
    expect(change.after.min_presences).toBe(get(configs, "gub-6").min_presences);
    expect(change.after.enabled).toBe(true);
    expect(change.changedFields).not.toContain("min_days");
  });

  it("rejeita nome vazio, cor inválida, número negativo e graduação desconhecida", () => {
    const { changes, issues } = planRankChanges(configs, [
      { rank_key: "gub-9", revision: 0, data: { display_name: " ", color_primary: "azulzão", min_days: -1 } },
      { rank_key: "gub-99", revision: 0, data: { display_name: "Fantasma" } }
    ]);
    expect(changes).toEqual([]);
    expect(issues.map((issue) => `${issue.rank_key ?? "-"}.${issue.field}`).sort()).toEqual(["-.rank_key", "gub-9.color_primary", "gub-9.display_name", "gub-9.min_days"].sort());
  });

  it("não aceita dois níveis com o mesmo nome", () => {
    const { issues } = planRankChanges(configs, [{ rank_key: "gub-9", revision: 0, data: { display_name: "  amarela " } }]);
    expect(issues).toEqual([expect.objectContaining({ field: "display_name", rank_key: "gub-9" })]);
  });

  it("trocar o nome de duas graduações entre si é válido", () => {
    const { issues, changes } = planRankChanges(configs, [
      { rank_key: "gub-8", revision: 0, data: { display_name: "Verde" } },
      { rank_key: "gub-6", revision: 0, data: { display_name: "Amarela" } }
    ]);
    expect(issues).toEqual([]);
    expect(changes).toHaveLength(2);
  });

  it("exige ao menos uma graduação habilitada", () => {
    const patches = RANK_KEYS.filter((key) => get(configs, key).enabled).map((key) => ({ rank_key: key, revision: 0, data: { enabled: false } }));
    expect(planRankChanges(configs, patches).issues).toEqual([expect.objectContaining({ field: "enabled" })]);
  });

  it("aceita tempo, presenças, idade, taxa e apelidos (texto separado por vírgula)", () => {
    const { changes, issues } = planRankChanges(configs, [
      { rank_key: "dan-1", revision: 0, data: { min_days: 365, min_presences: 100, min_age_years: 15, exam_fee_cents: 30000, aliases: "1º Dan, Faixa preta, Faixa preta" } }
    ]);
    expect(issues).toEqual([]);
    expect(changes[0].after).toMatchObject({ min_days: 365, min_presences: 100, min_age_years: 15, exam_fee_cents: 30000, aliases: ["1º Dan", "Faixa preta"] });
  });

  it("limpar tempo ou taxa volta a usar o padrão (null)", () => {
    const { changes } = planRankChanges(configs, [{ rank_key: "gub-6", revision: 0, data: { min_days: "", min_presences: null } }]);
    expect(changes[0].after.min_days).toBeNull();
    expect(changes[0].after.min_presences).toBeNull();
  });

  it("applyRankChanges devolve a configuração resultante sem tocar nas outras graduações", () => {
    const { changes } = planRankChanges(configs, [{ rank_key: "gub-9", revision: 0, data: { min_days: 10 } }]);
    const next = applyRankChanges(configs, changes);
    expect(get(next, "gub-9").min_days).toBe(10);
    expect(get(next, "gub-8")).toEqual(get(configs, "gub-8"));
    expect(get(configs, "gub-9").min_days).toBe(90);
  });
});

describe("graduação com alunos não pode ser desativada", () => {
  const students = [{ rank_key: "gub-5" }, { rank_key: "gub-5" }, { rank_key: "gub-10" }, { rank_key: null }, {}];
  const usage = countStudentsByRank(students);

  it("conta alunos por graduação", () => {
    expect(usage.get("gub-5")).toBe(2);
    expect(usage.get("gub-10")).toBe(1);
    expect(usage.get("gub-1")).toBeUndefined();
  });

  it("bloqueia desativar uma graduação em uso e libera as vazias", () => {
    const { changes } = planRankChanges(configs, [
      { rank_key: "gub-5", revision: 0, data: { enabled: false } },
      { rank_key: "gub-1", revision: 0, data: { enabled: false } },
      { rank_key: "poom-1", revision: 0, data: { enabled: true } }
    ]);
    expect(disabledRanksInUse(changes, usage)).toEqual([{ rank_key: "gub-5", students: 2 }]);
  });

  it("habilitar nunca é bloqueado", () => {
    const { changes } = planRankChanges(configs, [{ rank_key: "dan-4", revision: 0, data: { enabled: true } }]);
    expect(disabledRanksInUse(changes, new Map([["dan-4", 3]]))).toEqual([]);
  });
});

describe("formulário de graduações", () => {
  it("converte o rascunho (reais, vírgulas) para o formato do servidor", () => {
    const draft = { ...toRankDraft(get(configs, "gub-9")), exam_fee: "150,50", aliases: "Yellow tip, ponta", min_age_years: "12", color_primary: "#ABC" };
    expect(rankDraftToData(draft)).toMatchObject({ exam_fee_cents: 15050, aliases: ["Yellow tip", "ponta"], min_age_years: 12, color_primary: "#aabbcc", min_days: 90 });
  });

  it("só gera alterações para as graduações editadas, levando a revisão que o professor viu", () => {
    const drafts = Object.fromEntries(configs.map((config) => [config.rank_key, toRankDraft(config)]));
    expect(buildRankPatches(configs, drafts)).toEqual([]);
    const configured = resolveRankConfigs([{ rank_key: "gub-9", revision: 4 }]);
    const patches = buildRankPatches(configured, { ...Object.fromEntries(configured.map((config) => [config.rank_key, toRankDraft(config)])), "gub-9": { ...toRankDraft(configured[1]), display_name: "Laranja" } });
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ rank_key: "gub-9", revision: 4, data: { display_name: "Laranja" } });
  });

  it("só pede o cálculo de impacto quando tempo, presença, idade ou habilitação mudam", () => {
    const visual = [{ rank_key: "gub-9", revision: 0, data: { display_name: "Laranja", color_primary: "#f97316" } }];
    expect(patchesAffectEligibility(visual, configs)).toBe(false);
    expect(patchesAffectEligibility([{ rank_key: "gub-9", revision: 0, data: { min_days: 30 } }], configs)).toBe(true);
    expect(patchesAffectEligibility([{ rank_key: "gub-9", revision: 0, data: { min_days: 90 } }], configs)).toBe(false);
    expect(patchesAffectEligibility([{ rank_key: "poom-1", revision: 0, data: { enabled: true } }], configs)).toBe(true);
  });
});

describe("modelos de federação", () => {
  it("são três e só trazem nomes, cores e formas", () => {
    expect(BELT_PRESETS.map((preset) => preset.id)).toEqual(["cbtkd", "itf", "kukkiwon"]);
    for (const preset of BELT_PRESETS) {
      for (const rank of preset.ranks) {
        expect(Object.keys(rank).sort()).toEqual(expect.arrayContaining(["color_primary", "color_secondary", "color_style", "display_name", "form_name", "rank_key"]));
        expect(Object.keys(rank)).not.toContain("min_days");
        expect(Object.keys(rank)).not.toContain("enabled");
      }
    }
  });

  it("o CBTKD é igual ao padrão do código: aplicá-lo sem personalização não muda nada", () => {
    expect(diffPreset(configs, findBeltPreset("cbtkd")!)).toEqual([]);
  });

  it("o ITF usa listras, 'Tul' e 'Gup' e marca formas incertas para revisão", () => {
    const itf = findBeltPreset("itf")!;
    expect(itf.formLabel).toBe("Tul");
    expect(itf.levelLabel).toBe("Gup");
    expect(itf.ranks.find((rank) => rank.rank_key === "gub-9")).toMatchObject({ display_name: "Branca listra Amarela", color_style: "stripe" });
    expect(itf.ranks.find((rank) => rank.rank_key === "gub-9")?.revise).toContain("form_name");
    expect(itf.ranks.some((rank) => rank.rank_key.startsWith("poom-"))).toBe(false);
  });

  it("o Kukkiwon usa 'Geup' e marca as cores dos gubs para revisão", () => {
    const kukkiwon = findBeltPreset("kukkiwon")!;
    expect(kukkiwon.levelLabel).toBe("Geup");
    expect(kukkiwon.ranks.find((rank) => rank.rank_key === "gub-8")?.revise).toContain("colors");
    expect(kukkiwon.ranks.find((rank) => rank.rank_key === "dan-1")?.revise ?? []).not.toContain("colors");
  });

  it("a prévia lista só as graduações que mudam e as gravações nunca incluem tempos, taxas ou habilitação", () => {
    const itf = findBeltPreset("itf")!;
    const customized = resolveRankConfigs([{ rank_key: "gub-9", min_days: 15, min_presences: 3, exam_fee_cents: 9900, aliases: ["meu apelido"], revision: 2 }]);
    const diffs = diffPreset(customized, itf);
    expect(diffs.length).toBeGreaterThan(0);
    // Amarela tem o mesmo nome e cor nos dois sistemas: só a forma muda (Taegeuk Il Jang para Dan-Gun).
    expect(diffs.find((diff) => diff.rank_key === "gub-8")?.changes).toEqual(["form_name"]);
    const patches = presetToPatches(customized, itf);
    const gub9 = patches.find((patch) => patch.rank_key === "gub-9")!;
    expect(gub9.revision).toBe(2);
    expect(Object.keys(gub9.data).sort()).toEqual(["color_primary", "color_secondary", "color_style", "display_name", "form_name"]);

    const { changes, issues } = planRankChanges(customized, patches);
    expect(issues).toEqual([]);
    const applied = applyRankChanges(customized, changes);
    // Tempos, taxa, apelidos e habilitação ficam como estavam; Poom não é tocado pelo ITF.
    expect(get(applied, "gub-9")).toMatchObject({ display_name: "Branca listra Amarela", min_days: 15, min_presences: 3, exam_fee_cents: 9900, aliases: ["meu apelido"], color_style: "stripe" });
    expect(get(applied, "poom-1")).toEqual(get(customized, "poom-1"));
    expect(applied.map((config) => config.enabled)).toEqual(customized.map((config) => config.enabled));
  });

  it("depois de aplicar, o professor ajusta livremente (o modelo não trava nenhum campo)", () => {
    const itf = findBeltPreset("itf")!;
    const { changes } = planRankChanges(configs, presetToPatches(configs, itf));
    const applied = applyRankChanges(configs, changes);
    const { changes: adjusted, issues } = planRankChanges(applied, [{ rank_key: "gub-9", revision: 1, data: { display_name: "Minha faixa", color_primary: "#7c3aed" } }]);
    expect(issues).toEqual([]);
    expect(adjusted[0].after).toMatchObject({ display_name: "Minha faixa", color_primary: "#7c3aed", color_style: "stripe" });
  });
});
