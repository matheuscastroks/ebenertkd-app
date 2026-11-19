import type { BeltColorStyle } from "@/features/academy/belt-colors";
import { CBTKD_PRESET } from "@/features/academy/presets/cbtkd";
import { RANK_KEYS, type RankKey } from "@/features/academy/ranks";

/**
 * Configuração de UMA graduação (uma linha de `belt_rank_settings`). Sem linha, vale o padrão abaixo:
 * os nomes, cores e requisitos que o sistema já usava antes de existir a configuração de faixas.
 */
export type RankSettings = {
  /** Nome usado na academia (alias): "Ponta Amarela", "Laranja"… */
  display_name: string;
  /** Nomes alternativos, para reconhecer o mesmo nível em dados e buscas. */
  aliases: string[];
  color_primary: string;
  color_secondary: string;
  color_style: BeltColorStyle;
  /** Poomsae/Tul exigido nesta graduação. */
  form_name: string | null;
  /** Tempo e presenças para SAIR desta graduação. `null` = usa o padrão de exame (gubs) ou não avalia (Poom/Dan). */
  min_days: number | null;
  min_presences: number | null;
  min_age_years: number | null;
  /** Sobrescreve a taxa padrão da banca para quem presta exame PARA esta graduação. */
  exam_fee_cents: number | null;
  enabled: boolean;
};

/** Tempo e presenças atuais por gub (antes `GUB_ELIGIBILITY_REQUIREMENTS`). */
const GUB_REQUIREMENTS: Record<string, { days: number; presences: number }> = {
  "gub-10": { days: 90, presences: 20 },
  "gub-9": { days: 90, presences: 20 },
  "gub-8": { days: 90, presences: 24 },
  "gub-7": { days: 90, presences: 24 },
  "gub-6": { days: 120, presences: 30 },
  "gub-5": { days: 120, presences: 30 },
  "gub-4": { days: 150, presences: 36 },
  "gub-3": { days: 150, presences: 36 },
  "gub-2": { days: 180, presences: 48 },
  "gub-1": { days: 180, presences: 48 }
};

/** Dan 1–3 ativos como antes; Poom e Dan 4–9 desativados até o professor habilitar. */
const ENABLED_BY_DEFAULT = new Set<RankKey>(["gub-10", "gub-9", "gub-8", "gub-7", "gub-6", "gub-5", "gub-4", "gub-3", "gub-2", "gub-1", "dan-1", "dan-2", "dan-3"]);

function buildDefaults(): Record<RankKey, RankSettings> {
  const entries = RANK_KEYS.map((key) => {
    const preset = CBTKD_PRESET.ranks.find((rank) => rank.rank_key === key)!;
    const requirement = GUB_REQUIREMENTS[key];
    const settings: RankSettings = {
      display_name: preset.display_name,
      aliases: [],
      color_primary: preset.color_primary,
      color_secondary: preset.color_secondary,
      color_style: preset.color_style,
      form_name: preset.form_name,
      min_days: requirement?.days ?? null,
      min_presences: requirement?.presences ?? null,
      min_age_years: null,
      exam_fee_cents: null,
      enabled: ENABLED_BY_DEFAULT.has(key)
    };
    return [key, settings] as const;
  });
  return Object.fromEntries(entries) as Record<RankKey, RankSettings>;
}

export const DEFAULT_RANK_SETTINGS: Readonly<Record<RankKey, RankSettings>> = buildDefaults();
