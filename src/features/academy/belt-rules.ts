import type { BeltAppearance, BeltColorStyle } from "@/features/academy/belt-colors";
import type { ExamPolicy } from "@/features/academy/defaults";
import { DEFAULT_RANK_SETTINGS, type RankSettings } from "@/features/academy/rank-defaults";
import { parseRankRow } from "@/features/academy/rank-schemas";
import { FIRST_RANK_KEY, RANK_CATALOG, rankEntry, rankShortLabel, type RankKey, type RankKind } from "@/features/academy/ranks";

/** O que qualquer tela precisa saber de uma graduação para exibi-la. Serializável (vai ao cliente). */
export type PublicRank = {
  rank_key: RankKey;
  display_name: string;
  color_primary: string;
  color_secondary: string;
  color_style: BeltColorStyle;
  form_name: string | null;
  enabled: boolean;
};

/** Graduação completa (administração e regras): configuração + catálogo + revisão. */
export type RankConfig = RankSettings & {
  rank_key: RankKey;
  kind: RankKind;
  number: number;
  order: number;
  revision: number;
  /** Há linha salva para esta graduação? Sem linha, vale o padrão do código. */
  configured: boolean;
};

export type RankRow = Record<string, unknown> & { rank_key: string; revision?: number };

/** Resolve as 23 graduações do catálogo: linha ausente ou campo inválido cai no padrão. Sempre na ordem de progressão. */
export function resolveRankConfigs(rows: readonly RankRow[] | null | undefined): RankConfig[] {
  const byKey = new Map((rows ?? []).map((row) => [row.rank_key, row]));
  return RANK_CATALOG.map((entry) => {
    const row = byKey.get(entry.key);
    return {
      ...parseRankRow(entry.key, row),
      rank_key: entry.key,
      kind: entry.kind,
      number: entry.number,
      order: entry.order,
      revision: typeof row?.revision === "number" ? row.revision : 0,
      configured: Boolean(row)
    };
  });
}

export function toPublicRank(config: RankSettings & { rank_key: RankKey }): PublicRank {
  return {
    rank_key: config.rank_key,
    display_name: config.display_name,
    color_primary: config.color_primary,
    color_secondary: config.color_secondary,
    color_style: config.color_style,
    form_name: config.form_name,
    enabled: config.enabled
  };
}

/** Padrões do código no formato público: usado sem provedor (testes) ou quando a leitura falha. */
export const DEFAULT_PUBLIC_RANKS: readonly PublicRank[] = RANK_CATALOG.map((entry) =>
  toPublicRank({ rank_key: entry.key, ...DEFAULT_RANK_SETTINGS[entry.key] })
);

export function findRank<R extends { rank_key: RankKey }>(ranks: readonly R[], key: string | null | undefined): R | undefined {
  return key ? ranks.find((rank) => rank.rank_key === key) : undefined;
}

/** Nome da faixa conforme a configuração. Sem graduação informada devolve `fallback`. */
export function beltNameOf(ranks: readonly PublicRank[], key: string | null | undefined, fallback = "Não informada"): string {
  return findRank(ranks, key)?.display_name ?? fallback;
}

/** Aparência da faixa para o `BeltBadge`. */
export function appearanceOf(ranks: readonly PublicRank[], key: string | null | undefined): BeltAppearance | null {
  const rank = findRank(ranks, key);
  return rank
    ? { name: rank.display_name, colorPrimary: rank.color_primary, colorSecondary: rank.color_secondary, colorStyle: rank.color_style }
    : null;
}

/** Graduações oferecidas nos seletores: só as habilitadas (mais `keep`, para não perder o valor já gravado). */
export function selectableRanks<R extends PublicRank>(ranks: readonly R[], keep?: string | null): R[] {
  return ranks.filter((rank) => rank.enabled || rank.rank_key === keep);
}

/** Próxima graduação HABILITADA na progressão (pula as desativadas, p. ex. Poom). `null` na última. */
export function nextEnabledRank<R extends PublicRank>(ranks: readonly R[], key: string | null | undefined): R | null {
  const current = findRank(ranks, key);
  if (!current) return null;
  const order = rankEntry(current.rank_key).order;
  return ranks.find((rank) => rank.enabled && rankEntry(rank.rank_key).order > order) ?? null;
}

/** Alvos possíveis de um exame: só a próxima (sem pular) ou todas as habilitadas acima. */
export function examTargetRanks<R extends PublicRank>(ranks: readonly R[], key: string | null | undefined, allowSkip: boolean): R[] {
  const current = findRank(ranks, key);
  if (!current) return [];
  const order = rankEntry(current.rank_key).order;
  const higher = ranks.filter((rank) => rank.enabled && rankEntry(rank.rank_key).order > order);
  return allowSkip ? higher : higher.slice(0, 1);
}

/** Texto com nome e nível: "Ponta Amarela (9º Gub)". */
export function rankFullLabel(ranks: readonly PublicRank[], key: string | null | undefined, levelLabel?: string | null): string {
  const rank = findRank(ranks, key);
  if (!rank) return "Graduação não informada";
  return `${rank.display_name} (${rankShortLabel(rank.rank_key, levelLabel)})`;
}

/** Graduação do aluno quando nada foi informado. */
export const DEFAULT_STUDENT_RANK: RankKey = FIRST_RANK_KEY;

export type RankRequirement = {
  minDays: number;
  minPresences: number;
  /** Poom/Dan sem tempo configurado não entram na avaliação automática de elegibilidade. */
  evaluated: boolean;
};

/** Requisito para SAIR de uma graduação: configurado por graduação, com o padrão de exame como reserva. */
export function rankRequirement(
  config: Pick<RankConfig, "kind" | "min_days" | "min_presences"> | undefined,
  exam: Pick<ExamPolicy, "fallback_min_days" | "fallback_min_presences">
): RankRequirement {
  if (!config) return { minDays: exam.fallback_min_days, minPresences: exam.fallback_min_presences, evaluated: true };
  if (config.kind !== "gub" && config.min_days == null && config.min_presences == null) {
    return { minDays: 0, minPresences: 0, evaluated: false };
  }
  return {
    minDays: config.min_days ?? exam.fallback_min_days,
    minPresences: config.min_presences ?? exam.fallback_min_presences,
    evaluated: true
  };
}

/** Procura uma graduação pelo nome ou apelido (sem diferenciar maiúsculas nem acentos). */
export function findRankByName(configs: ReadonlyArray<Pick<RankConfig, "rank_key" | "display_name" | "aliases">>, text: string): RankKey | null {
  const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();
  const wanted = normalize(text);
  if (!wanted) return null;
  const match = configs.find((config) => normalize(config.display_name) === wanted || config.aliases.some((alias) => normalize(alias) === wanted));
  return match?.rank_key ?? null;
}
