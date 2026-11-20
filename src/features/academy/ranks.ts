/**
 * Catálogo FIXO de graduações: o gub é o eixo central e a lista é idêntica para toda academia.
 * O que muda entre academias e federações é o nome e a cor de cada graduação (`belt_rank_settings`),
 * nunca as chaves nem a ordem de progressão. Módulo puro.
 */

export type RankKind = "gub" | "poom" | "dan";

const GUB_KEYS = ["gub-10", "gub-9", "gub-8", "gub-7", "gub-6", "gub-5", "gub-4", "gub-3", "gub-2", "gub-1"] as const;
const POOM_KEYS = ["poom-1", "poom-2", "poom-3", "poom-4"] as const;
const DAN_KEYS = ["dan-1", "dan-2", "dan-3", "dan-4", "dan-5", "dan-6", "dan-7", "dan-8", "dan-9"] as const;

/** Ordem de progressão: 10º gub … 1º gub, Poom 1–4, Dan 1–9. */
export const RANK_KEYS = [...GUB_KEYS, ...POOM_KEYS, ...DAN_KEYS] as const;
export type RankKey = (typeof RANK_KEYS)[number];

export type RankCatalogEntry = {
  key: RankKey;
  kind: RankKind;
  /** Número dentro do grupo (10 para gub-10, 1 para dan-1). */
  number: number;
  /** Posição na progressão (0 = 10º gub). */
  order: number;
};

export const RANK_CATALOG: readonly RankCatalogEntry[] = RANK_KEYS.map((key, order) => {
  const [kind, number] = key.split("-") as [RankKind, string];
  return { key, kind, number: Number(number), order };
});

const BY_KEY = new Map<string, RankCatalogEntry>(RANK_CATALOG.map((entry) => [entry.key, entry]));

export function isRankKey(value: unknown): value is RankKey {
  return typeof value === "string" && BY_KEY.has(value);
}

export function rankEntry(key: RankKey): RankCatalogEntry {
  return BY_KEY.get(key)!;
}

export function rankOrder(key: RankKey): number {
  return rankEntry(key).order;
}

export function compareRankKeys(a: RankKey, b: RankKey): number {
  return rankOrder(a) - rankOrder(b);
}

/** Primeiro gub do catálogo: onde todo aluno novo começa quando nada foi informado. */
export const FIRST_RANK_KEY: RankKey = "gub-10";

const KIND_LABEL: Record<RankKind, string> = { gub: "Gub", poom: "Poom", dan: "Dan" };

/** "9º Gub", "1º Poom", "3º Dan". `levelLabel` troca "Gub" por "Gup"/"Geup" conforme a federação. */
export function rankShortLabel(key: RankKey, levelLabel?: string | null): string {
  const entry = rankEntry(key);
  const label = entry.kind === "gub" ? levelLabel?.trim() || KIND_LABEL.gub : KIND_LABEL[entry.kind];
  return `${entry.number}º ${label}`;
}

/** Número do gub (10 a 1) ou `null` para Poom e Dan. */
export function gubNumber(key: RankKey): number | null {
  const entry = rankEntry(key);
  return entry.kind === "gub" ? entry.number : null;
}

export function isGubRank(key: RankKey): boolean {
  return rankEntry(key).kind === "gub";
}
