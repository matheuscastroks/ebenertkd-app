import type { RankConfig } from "@/features/academy/belt-rules";
import type { BeltPreset, PresetField } from "@/features/academy/presets/types";
import type { RankKey } from "@/features/academy/ranks";

export type PresetRankDiff = {
  rank_key: RankKey;
  before: Pick<RankConfig, "display_name" | "color_primary" | "color_secondary" | "color_style" | "form_name">;
  after: Pick<RankConfig, "display_name" | "color_primary" | "color_secondary" | "color_style" | "form_name">;
  /** Campos que mudam com o modelo. */
  changes: PresetField[];
  /** Campos que o próprio modelo marca como incertos ("Revise: valor sugerido"). */
  revise: PresetField[];
};

/**
 * O que "Aplicar modelo" mudaria: só nome, cores/estilo e forma. Tempos, presenças, idade, taxa, apelidos e
 * habilitação (e, claro, alunos) nunca entram. Graduações que o modelo não define ficam como estão.
 */
export function diffPreset(current: readonly RankConfig[], preset: BeltPreset): PresetRankDiff[] {
  const byKey = new Map(current.map((config) => [config.rank_key as string, config]));
  const diffs: PresetRankDiff[] = [];
  for (const rank of preset.ranks) {
    const config = byKey.get(rank.rank_key);
    if (!config) continue;
    const before = {
      display_name: config.display_name,
      color_primary: config.color_primary,
      color_secondary: config.color_secondary,
      color_style: config.color_style,
      form_name: config.form_name
    };
    const after = {
      display_name: rank.display_name,
      color_primary: rank.color_primary,
      color_secondary: rank.color_secondary,
      color_style: rank.color_style,
      form_name: rank.form_name
    };
    const changes: PresetField[] = [];
    if (before.display_name !== after.display_name) changes.push("display_name");
    if (before.color_primary !== after.color_primary || before.color_secondary !== after.color_secondary || before.color_style !== after.color_style) {
      changes.push("colors");
    }
    if ((before.form_name ?? null) !== (after.form_name ?? null)) changes.push("form_name");
    if (changes.length > 0) diffs.push({ rank_key: rank.rank_key, before, after, changes, revise: rank.revise ?? [] });
  }
  return diffs;
}

/** Alterações a gravar para aplicar o modelo (somente nomes, cores e formas). */
export function presetToPatches(current: readonly RankConfig[], preset: BeltPreset) {
  const byKey = new Map(current.map((config) => [config.rank_key as string, config]));
  return diffPreset(current, preset).map((diff) => ({
    rank_key: diff.rank_key as string,
    revision: byKey.get(diff.rank_key)?.revision ?? 0,
    data: { ...diff.after }
  }));
}
