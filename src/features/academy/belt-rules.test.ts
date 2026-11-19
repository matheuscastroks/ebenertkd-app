import { describe, expect, it } from "vitest";
import { BELT_COLOR_PALETTE, beltBackground, parseHexInput, readableTextColor, swatchOutline } from "@/features/academy/belt-colors";
import {
  appearanceOf,
  beltNameOf,
  examTargetRanks,
  findRankByName,
  nextEnabledRank,
  rankFullLabel,
  rankRequirement,
  resolveRankConfigs,
  selectableRanks,
  toPublicRank
} from "@/features/academy/belt-rules";
import { DEFAULT_RANK_SETTINGS } from "@/features/academy/rank-defaults";
import { compareRankKeys, gubNumber, isRankKey, RANK_CATALOG, RANK_KEYS, rankOrder, rankShortLabel } from "@/features/academy/ranks";

describe("catálogo de graduações", () => {
  it("é fixo: 10º a 1º gub, Poom 1-4 e Dan 1-9 na ordem de progressão", () => {
    expect(RANK_KEYS).toEqual([
      "gub-10", "gub-9", "gub-8", "gub-7", "gub-6", "gub-5", "gub-4", "gub-3", "gub-2", "gub-1",
      "poom-1", "poom-2", "poom-3", "poom-4",
      "dan-1", "dan-2", "dan-3", "dan-4", "dan-5", "dan-6", "dan-7", "dan-8", "dan-9"
    ]);
    expect(RANK_CATALOG.map((entry) => entry.order)).toEqual(RANK_KEYS.map((_, index) => index));
    expect(compareRankKeys("gub-10", "gub-9")).toBeLessThan(0);
    expect(rankOrder("dan-1")).toBeGreaterThan(rankOrder("poom-4"));
    expect(isRankKey("gub-5")).toBe(true);
    expect(isRankKey("gub-11")).toBe(false);
    expect(isRankKey(8)).toBe(false);
    expect(gubNumber("gub-7")).toBe(7);
    expect(gubNumber("dan-1")).toBeNull();
  });

  it("nomeia o nível conforme o termo da federação (só o gub muda de nome)", () => {
    expect(rankShortLabel("gub-9")).toBe("9º Gub");
    expect(rankShortLabel("gub-9", "Gup")).toBe("9º Gup");
    expect(rankShortLabel("poom-1", "Gup")).toBe("1º Poom");
    expect(rankShortLabel("dan-3", "Geup")).toBe("3º Dan");
  });
});

describe("padrões do código = valores de hoje", () => {
  it("nomes, cores e requisitos atuais por gub", () => {
    const names = RANK_KEYS.slice(0, 10).map((key) => DEFAULT_RANK_SETTINGS[key].display_name);
    expect(names).toEqual(["Branca", "Ponta Amarela", "Amarela", "Ponta Verde", "Verde", "Ponta Azul", "Azul", "Ponta Vermelha", "Vermelha", "Ponta Preta"]);
    const requirements = RANK_KEYS.slice(0, 10).map((key) => [DEFAULT_RANK_SETTINGS[key].min_days, DEFAULT_RANK_SETTINGS[key].min_presences]);
    expect(requirements).toEqual([[90, 20], [90, 20], [90, 24], [90, 24], [120, 30], [120, 30], [150, 36], [150, 36], [180, 48], [180, 48]]);
    expect(DEFAULT_RANK_SETTINGS["gub-9"]).toMatchObject({ color_style: "tip", color_primary: "#ffffff", color_secondary: "#fbbf24", form_name: "Preliminary Poomsae" });
    expect(DEFAULT_RANK_SETTINGS["dan-1"]).toMatchObject({ display_name: "Preta", form_name: "Koryo" });
    expect(DEFAULT_RANK_SETTINGS["dan-2"].display_name).toBe("Preta 2º Dan");
    expect(DEFAULT_RANK_SETTINGS["dan-3"].form_name).toBe("Taebaek");
  });

  it("Poom desativado; Dan 1 a 3 habilitados; Dan 4 a 9 desativados", () => {
    const enabled = RANK_KEYS.filter((key) => DEFAULT_RANK_SETTINGS[key].enabled);
    expect(enabled).toEqual(["gub-10", "gub-9", "gub-8", "gub-7", "gub-6", "gub-5", "gub-4", "gub-3", "gub-2", "gub-1", "dan-1", "dan-2", "dan-3"]);
  });

  it("Poom e Dan não têm tempo nem presença por padrão (como hoje: faixa preta não é avaliada)", () => {
    for (const key of RANK_KEYS.slice(10)) {
      expect(DEFAULT_RANK_SETTINGS[key].min_days).toBeNull();
      expect(DEFAULT_RANK_SETTINGS[key].min_presences).toBeNull();
    }
  });

  it("os nomes padrão são únicos", () => {
    const names = RANK_KEYS.map((key) => DEFAULT_RANK_SETTINGS[key].display_name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("resolveRankConfigs", () => {
  it("sem linhas devolve as 23 graduações com os padrões, na ordem de progressão", () => {
    const configs = resolveRankConfigs(null);
    expect(configs.map((config) => config.rank_key)).toEqual([...RANK_KEYS]);
    expect(configs.every((config) => !config.configured && config.revision === 0)).toBe(true);
  });

  it("mistura a linha salva sobre o padrão, campo a campo", () => {
    const configs = resolveRankConfigs([{ rank_key: "gub-9", display_name: "Laranja", color_primary: "#F97316", color_style: "solid", min_days: 60, revision: 3 }]);
    const gub9 = configs.find((config) => config.rank_key === "gub-9")!;
    expect(gub9).toMatchObject({ display_name: "Laranja", color_primary: "#f97316", color_style: "solid", min_days: 60, configured: true, revision: 3 });
    // Campos ausentes mantêm o padrão.
    expect(gub9.min_presences).toBe(20);
    expect(gub9.form_name).toBe("Preliminary Poomsae");
  });

  it("campo inválido volta ao padrão sem derrubar os válidos", () => {
    const [gub10] = resolveRankConfigs([{ rank_key: "gub-10", display_name: "", color_primary: "vermelho", min_days: -4, enabled: "talvez", form_name: "Forma própria" }]);
    expect(gub10.display_name).toBe("Branca");
    expect(gub10.color_primary).toBe("#ffffff");
    expect(gub10.min_days).toBe(90);
    expect(gub10.enabled).toBe(true);
    expect(gub10.form_name).toBe("Forma própria");
  });

  it("ignora linhas de graduações que não existem no catálogo", () => {
    const configs = resolveRankConfigs([{ rank_key: "gub-99", display_name: "Fantasma" }]);
    expect(configs).toHaveLength(23);
    expect(configs.some((config) => config.display_name === "Fantasma")).toBe(false);
  });
});

describe("seleção e progressão", () => {
  const configs = resolveRankConfigs(null);
  const ranks = configs.map(toPublicRank);
  const withPoom = ranks.map((rank) => (rank.rank_key.startsWith("poom-") ? { ...rank, enabled: true } : rank));

  it("os seletores listam só as graduações habilitadas, mais a atual do aluno", () => {
    expect(selectableRanks(ranks).map((rank) => rank.rank_key)).toHaveLength(13);
    expect(selectableRanks(ranks).some((rank) => rank.rank_key === "poom-1")).toBe(false);
    expect(selectableRanks(ranks, "poom-1").some((rank) => rank.rank_key === "poom-1")).toBe(true);
    expect(selectableRanks(withPoom).some((rank) => rank.rank_key === "poom-1")).toBe(true);
  });

  it("a próxima graduação pula as desativadas", () => {
    expect(nextEnabledRank(ranks, "gub-10")?.rank_key).toBe("gub-9");
    expect(nextEnabledRank(ranks, "gub-1")?.rank_key).toBe("dan-1");
    expect(nextEnabledRank(withPoom, "gub-1")?.rank_key).toBe("poom-1");
    expect(nextEnabledRank(withPoom, "poom-4")?.rank_key).toBe("dan-1");
    expect(nextEnabledRank(ranks, "dan-3")).toBeNull();
    expect(nextEnabledRank(ranks, null)).toBeNull();
    expect(nextEnabledRank(ranks, "xx")).toBeNull();
  });

  it("alvos do exame: só a próxima ou qualquer uma acima", () => {
    expect(examTargetRanks(ranks, "gub-8", false).map((rank) => rank.rank_key)).toEqual(["gub-7"]);
    expect(examTargetRanks(ranks, "gub-2", true).map((rank) => rank.rank_key)).toEqual(["gub-1", "dan-1", "dan-2", "dan-3"]);
    expect(examTargetRanks(ranks, "dan-3", true)).toEqual([]);
  });

  it("nomes e aparência vêm sempre da configuração", () => {
    const renamed = ranks.map((rank) => (rank.rank_key === "gub-9" ? { ...rank, display_name: "Laranja", color_primary: "#f97316" } : rank));
    expect(beltNameOf(renamed, "gub-9")).toBe("Laranja");
    expect(beltNameOf(renamed, null)).toBe("Não informada");
    expect(appearanceOf(renamed, "gub-9")).toMatchObject({ name: "Laranja", colorPrimary: "#f97316" });
    expect(appearanceOf(renamed, "outro")).toBeNull();
    expect(rankFullLabel(renamed, "gub-9", "Gup")).toBe("Laranja (9º Gup)");
    expect(rankFullLabel(renamed, undefined)).toBe("Graduação não informada");
  });

  it("encontra uma graduação pelo nome ou apelido, sem acento nem maiúsculas", () => {
    const withAlias = configs.map((config) => (config.rank_key === "gub-9" ? { ...config, aliases: ["Branca ponta amarela", "Yellow Tip"] } : config));
    expect(findRankByName(withAlias, "ponta AMARELA")).toBe("gub-9");
    expect(findRankByName(withAlias, "yellow tip")).toBe("gub-9");
    expect(findRankByName(withAlias, "  ")).toBeNull();
    expect(findRankByName(withAlias, "Roxa")).toBeNull();
  });
});

describe("requisito para sair da graduação", () => {
  const exam = { fallback_min_days: 100, fallback_min_presences: 25 };
  const configs = resolveRankConfigs(null);
  const get = (key: string) => configs.find((config) => config.rank_key === key)!;

  it("usa o configurado, com o padrão da política como reserva", () => {
    expect(rankRequirement(get("gub-6"), exam)).toEqual({ minDays: 120, minPresences: 30, evaluated: true });
    expect(rankRequirement({ ...get("gub-6"), min_days: null }, exam)).toEqual({ minDays: 100, minPresences: 30, evaluated: true });
    expect(rankRequirement(undefined, exam)).toEqual({ minDays: 100, minPresences: 25, evaluated: true });
  });

  it("Poom e Dan sem tempo configurado não são avaliados; com tempo, passam a ser", () => {
    expect(rankRequirement(get("dan-1"), exam).evaluated).toBe(false);
    expect(rankRequirement({ ...get("dan-1"), min_days: 365 }, exam)).toEqual({ minDays: 365, minPresences: 25, evaluated: true });
  });
});

describe("cores", () => {
  it("a paleta tem as dez cores comuns", () => {
    expect(BELT_COLOR_PALETTE.map((color) => color.label)).toEqual(["Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Vermelha", "Preta"]);
    expect(BELT_COLOR_PALETTE.every((color) => /^#[0-9a-f]{6}$/.test(color.hex))).toBe(true);
  });

  it("aceita hex curto, com ou sem #, e rejeita o resto", () => {
    expect(parseHexInput("#ABC")).toBe("#aabbcc");
    expect(parseHexInput("2563EB")).toBe("#2563eb");
    expect(parseHexInput(" #0a0a0a ")).toBe("#0a0a0a");
    expect(parseHexInput("#12")).toBeNull();
    expect(parseHexInput("azul")).toBeNull();
    expect(parseHexInput("#12345g")).toBeNull();
  });

  it("calcula o texto legível sobre qualquer cor", () => {
    expect(readableTextColor("#ffffff")).toBe("#0a0a0a");
    expect(readableTextColor("#fbbf24")).toBe("#0a0a0a");
    expect(readableTextColor("#0a0a0a")).toBe("#ffffff");
    expect(readableTextColor("#2563eb")).toBe("#ffffff");
    expect(readableTextColor("não-é-cor")).toBe("#0a0a0a");
  });

  it("dá contorno às faixas que se confundem com o fundo", () => {
    expect(swatchOutline("#ffffff")).toBe("rgba(128,128,128,0.7)");
    expect(swatchOutline("#0a0a0a")).toBe("rgba(128,128,128,0.7)");
    expect(swatchOutline("#2563eb")).toBe("rgba(0,0,0,0.25)");
  });

  it("monta o fundo de cada estilo", () => {
    const colors = { colorPrimary: "#111111", colorSecondary: "#eeeeee" };
    expect(beltBackground({ ...colors, colorStyle: "solid" })).toBe("#111111");
    expect(beltBackground({ ...colors, colorStyle: "tip" })).toContain("#eeeeee 72% 100%");
    expect(beltBackground({ ...colors, colorStyle: "stripe" })).toContain("#eeeeee 36% 64%");
    expect(beltBackground({ ...colors, colorStyle: "half" })).toContain("#eeeeee 50% 100%");
  });
});
