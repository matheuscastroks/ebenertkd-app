import type { RankConfig } from "@/features/academy/belt-rules";
import type { RankSettings } from "@/features/academy/rank-defaults";
import {
  duplicateNameIssues,
  parseRankInput,
  RANK_SETTING_FIELDS,
  RankValidationError,
  type RankIssue
} from "@/features/academy/rank-schemas";
import { isRankKey, type RankKey } from "@/features/academy/ranks";

/** Alteração pedida pela tela: só os campos que mudaram, mais a revisão que o professor viu (concorrência otimista). */
export type RankPatch = { rank_key: string; revision: number; data: Record<string, unknown> };

export type RankChange = {
  rank_key: RankKey;
  /** Revisão esperada na gravação (0 = a graduação ainda não tem linha salva). */
  revision: number;
  before: RankSettings;
  after: RankSettings;
  changedFields: Array<keyof RankSettings>;
};

export function settingsOf(config: RankSettings): RankSettings {
  return Object.fromEntries(RANK_SETTING_FIELDS.map((field) => [field, config[field]])) as unknown as RankSettings;
}

export function changedRankFields(before: RankSettings, after: RankSettings): Array<keyof RankSettings> {
  return RANK_SETTING_FIELDS.filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
}

/**
 * Valida as alterações sobre a configuração atual e devolve só o que realmente muda. Pura: não lê nem grava.
 * Erros de campo, nome repetido entre graduações e "nenhuma graduação habilitada" voltam em `issues`.
 */
export function planRankChanges(current: readonly RankConfig[], patches: readonly RankPatch[]): { changes: RankChange[]; issues: RankIssue[] } {
  const issues: RankIssue[] = [];
  const byKey = new Map(current.map((config) => [config.rank_key as string, config]));
  const finalSettings = new Map<RankKey, RankSettings>(current.map((config) => [config.rank_key, settingsOf(config)]));
  const changes: RankChange[] = [];

  for (const patch of patches) {
    if (!isRankKey(patch.rank_key) || !byKey.has(patch.rank_key)) {
      issues.push({ field: "rank_key", message: "Graduação inválida" });
      continue;
    }
    const config = byKey.get(patch.rank_key)!;
    const before = settingsOf(config);
    try {
      const after = parseRankInput(patch.rank_key, { ...before, ...patch.data });
      const changedFields = changedRankFields(before, after);
      if (changedFields.length === 0) continue;
      finalSettings.set(patch.rank_key, after);
      changes.push({ rank_key: patch.rank_key, revision: patch.revision, before, after, changedFields });
    } catch (error) {
      if (error instanceof RankValidationError) issues.push(...error.issues);
      else throw error;
    }
  }

  if (issues.length === 0) {
    // Os nomes alterados entram por último: o aviso de nome repetido cai na graduação que o professor mexeu.
    const changedKeys = new Set(changes.map((change) => change.rank_key));
    const names = [...finalSettings].map(([rank_key, settings]) => ({ rank_key, display_name: settings.display_name }));
    issues.push(...duplicateNameIssues([...names.filter((item) => !changedKeys.has(item.rank_key)), ...names.filter((item) => changedKeys.has(item.rank_key))]));
    if (![...finalSettings.values()].some((settings) => settings.enabled)) {
      issues.push({ field: "enabled", message: "Mantenha ao menos uma graduação habilitada" });
    }
  }
  return { changes, issues };
}

export function countStudentsByRank(students: ReadonlyArray<{ rank_key?: string | null }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const student of students) {
    if (!student.rank_key) continue;
    counts.set(student.rank_key, (counts.get(student.rank_key) ?? 0) + 1);
  }
  return counts;
}

/** Graduações que o pedido desativa mas ainda têm alunos: não podem ser desativadas. */
export function disabledRanksInUse(changes: readonly RankChange[], usage: ReadonlyMap<string, number>): Array<{ rank_key: RankKey; students: number }> {
  return changes
    .filter((change) => change.before.enabled && !change.after.enabled && (usage.get(change.rank_key) ?? 0) > 0)
    .map((change) => ({ rank_key: change.rank_key, students: usage.get(change.rank_key) ?? 0 }));
}

export class RankInUseError extends Error {
  constructor(readonly ranks: Array<{ rank_key: RankKey; students: number }>) {
    super("rank_in_use");
  }
}

/** Configuração resultante depois de aplicar as alterações (para calcular o impacto antes de salvar). */
export function applyRankChanges(current: readonly RankConfig[], changes: readonly RankChange[]): RankConfig[] {
  const byKey = new Map(changes.map((change) => [change.rank_key as string, change]));
  return current.map((config) => {
    const change = byKey.get(config.rank_key);
    return change ? { ...config, ...change.after } : config;
  });
}
