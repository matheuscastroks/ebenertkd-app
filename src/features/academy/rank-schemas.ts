import { z } from "zod";
import { BELT_COLOR_STYLES, parseHexInput } from "@/features/academy/belt-colors";
import { DEFAULT_RANK_SETTINGS, type RankSettings } from "@/features/academy/rank-defaults";
import type { RankKey } from "@/features/academy/ranks";
import { nullableInt } from "@/features/academy/schemas";

const hexColor = z.preprocess(
  (value) => (typeof value === "string" ? (parseHexInput(value) ?? value) : value),
  z.string().regex(/^#[0-9a-f]{6}$/, "Cor inválida (use #RRGGBB)")
);

/** "a, b" (vírgula ou quebra de linha) ou lista: devolve a lista sem vazios. */
export function parseAliases(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return value;
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

/** Campo a campo, como `POLICY_FIELD_SCHEMAS`: a leitura aproveita os campos válidos. */
export const RANK_FIELD_SCHEMAS = {
  display_name: z.string().trim().min(2, "Informe o nome da faixa").max(64, "Use até 64 caracteres"),
  aliases: z.preprocess(
    parseAliases,
    z.array(z.string().trim().min(1).max(64)).max(10, "Use até 10 nomes alternativos").transform((list) => [...new Set(list)])
  ),
  color_primary: hexColor,
  color_secondary: hexColor,
  color_style: z.enum(BELT_COLOR_STYLES),
  form_name: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : (value ?? null)),
    z.string().max(96).nullable()
  ),
  min_days: nullableInt(0, 3650),
  min_presences: nullableInt(0, 2000),
  min_age_years: nullableInt(0, 100),
  exam_fee_cents: nullableInt(0, 1_000_000),
  enabled: z.boolean()
} as const satisfies Record<keyof RankSettings, z.ZodType>;

export const RANK_SETTING_FIELDS = Object.keys(RANK_FIELD_SCHEMAS) as Array<keyof RankSettings>;

export type RankIssue = { field: string; message: string; rank_key?: RankKey };

export class RankValidationError extends Error {
  constructor(readonly issues: RankIssue[]) {
    super("invalid_rank");
  }
}

/** Gravação: estrita. Campo inválido vira `RankValidationError`. */
export function parseRankInput(rankKey: RankKey, raw: unknown): RankSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const defaults = DEFAULT_RANK_SETTINGS[rankKey] as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const issues: RankIssue[] = [];
  for (const field of RANK_SETTING_FIELDS) {
    const parsed = RANK_FIELD_SCHEMAS[field].safeParse(field in source ? source[field] : defaults[field]);
    if (parsed.success) result[field] = parsed.data;
    else issues.push({ field, rank_key: rankKey, message: parsed.error.issues[0]?.message ?? "Valor inválido" });
  }
  if (issues.length > 0) throw new RankValidationError(issues);
  return result as unknown as RankSettings;
}

/** Leitura: tolerante. Cada campo inválido volta ao padrão. */
export function parseRankRow(rankKey: RankKey, row: Record<string, unknown> | null | undefined): RankSettings {
  const defaults = DEFAULT_RANK_SETTINGS[rankKey] as unknown as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const field of RANK_SETTING_FIELDS) {
    const raw = row && field in row && row[field] !== undefined ? row[field] : undefined;
    const parsed = raw === undefined ? null : RANK_FIELD_SCHEMAS[field].safeParse(raw);
    result[field] = parsed?.success ? parsed.data : Array.isArray(defaults[field]) ? [...(defaults[field] as unknown[])] : defaults[field];
  }
  return result as unknown as RankSettings;
}

/** Nomes repetidos entre graduações (o aluno precisa distinguir as faixas pelo nome). */
export function duplicateNameIssues(names: ReadonlyArray<{ rank_key: RankKey; display_name: string }>): RankIssue[] {
  const seen = new Map<string, RankKey>();
  const issues: RankIssue[] = [];
  for (const { rank_key, display_name } of names) {
    const normalized = display_name.trim().toLocaleLowerCase("pt-BR");
    const first = seen.get(normalized);
    if (first && first !== rank_key) {
      issues.push({ field: "display_name", rank_key, message: "Já existe outra graduação com este nome" });
    } else {
      seen.set(normalized, rank_key);
    }
  }
  return issues;
}
