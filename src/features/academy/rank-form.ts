import { parseHexInput, type BeltColorStyle } from "@/features/academy/belt-colors";
import type { RankConfig } from "@/features/academy/belt-rules";
import type { RankPatch } from "@/features/academy/rank-changes";
import { centsToInput, parseMoneyInput } from "@/features/billing/money-input";

/** Estado de edição de uma graduação: campos de texto como o professor digita (reais, dias, vírgulas). */
export type RankDraft = {
  display_name: string;
  aliases: string;
  color_primary: string;
  color_secondary: string;
  color_style: BeltColorStyle;
  form_name: string;
  min_days: string;
  min_presences: string;
  min_age_years: string;
  /** Em reais ("150,00"); vazio = usa a taxa da banca. */
  exam_fee: string;
  enabled: boolean;
};

type DraftSource = Pick<
  RankConfig,
  "display_name" | "aliases" | "color_primary" | "color_secondary" | "color_style" | "form_name" | "min_days" | "min_presences" | "min_age_years" | "exam_fee_cents" | "enabled"
>;

const numberText = (value: number | null) => (value == null ? "" : String(value));

export function toRankDraft(config: DraftSource): RankDraft {
  return {
    display_name: config.display_name,
    aliases: config.aliases.join(", "),
    color_primary: config.color_primary,
    color_secondary: config.color_secondary,
    color_style: config.color_style,
    form_name: config.form_name ?? "",
    min_days: numberText(config.min_days),
    min_presences: numberText(config.min_presences),
    min_age_years: numberText(config.min_age_years),
    exam_fee: config.exam_fee_cents == null ? "" : centsToInput(config.exam_fee_cents) || "0",
    enabled: config.enabled
  };
}

/** Texto numérico opcional: vazio = `null` (usa o padrão); texto inválido vira NaN e o servidor rejeita. */
function optionalNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
}

/** Valores no formato do servidor (centavos, listas, `null`). */
export function rankDraftToData(draft: RankDraft): Record<string, unknown> {
  return {
    display_name: draft.display_name.trim(),
    aliases: draft.aliases.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
    color_primary: parseHexInput(draft.color_primary) ?? draft.color_primary.trim(),
    color_secondary: parseHexInput(draft.color_secondary) ?? draft.color_secondary.trim(),
    color_style: draft.color_style,
    form_name: draft.form_name.trim() || null,
    min_days: optionalNumber(draft.min_days),
    min_presences: optionalNumber(draft.min_presences),
    min_age_years: optionalNumber(draft.min_age_years),
    exam_fee_cents: draft.exam_fee.trim() ? parseMoneyInput(draft.exam_fee) : null,
    enabled: draft.enabled
  };
}

/** Só as graduações que o professor alterou, cada uma com a revisão que ele viu. */
export function buildRankPatches(configs: readonly RankConfig[], drafts: Readonly<Record<string, RankDraft>>): RankPatch[] {
  const patches: RankPatch[] = [];
  for (const config of configs) {
    const draft = drafts[config.rank_key];
    if (!draft) continue;
    const data = rankDraftToData(draft);
    if (JSON.stringify(data) === JSON.stringify(rankDraftToData(toRankDraft(config)))) continue;
    patches.push({ rank_key: config.rank_key, revision: config.revision, data });
  }
  return patches;
}

/** Os tempos, presenças e idade mudaram? Só então vale calcular o impacto na elegibilidade. */
export function patchesAffectEligibility(patches: readonly RankPatch[], configs: readonly RankConfig[]): boolean {
  const byKey = new Map(configs.map((config) => [config.rank_key as string, config]));
  return patches.some((patch) => {
    const config = byKey.get(patch.rank_key);
    if (!config) return false;
    return (["min_days", "min_presences", "min_age_years", "enabled"] as const).some(
      (field) => field in patch.data && JSON.stringify(patch.data[field] ?? null) !== JSON.stringify(config[field] ?? null)
    );
  });
}
