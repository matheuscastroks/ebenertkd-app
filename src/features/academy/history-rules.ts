import { isRankKey, rankShortLabel } from "@/features/academy/ranks";
import { formatBrl } from "@/lib/money";

export type RevisionScope = "settings" | "policy" | "belt_ranks";

export type DiffRow = { field: string; label: string; before: string; after: string };

/** Identidade: contato, documento, endereço e nome do professor nunca aparecem na linha do tempo (só "alterado"). */
export const REDACTED_FIELDS: ReadonlySet<string> = new Set([
  "document_type", "document_number", "address_line", "address_complement", "address_district", "address_city", "address_state",
  "address_zip", "phone_whatsapp", "contact_email", "instagram_handle", "professor_name", "professor_title", "professor_graduation",
  "privacy_contact", "dpo_name"
]);

const SECTION_LABELS: Record<string, string> = {
  identity: "Identidade",
  billing: "Financeiro",
  access: "Acesso ao aplicativo",
  contract: "Contratos",
  exam: "Exames",
  belts: "Termos das graduações",
  retention: "Risco de evasão",
  compliance: "Atestado e PAR-Q",
  notifications: "Lembretes de pagamento",
  gamification: "Conquistas"
};

const FIELD_LABELS: Record<string, string> = {
  legal_name: "Nome legal", display_name: "Nome de exibição", short_name: "Nome curto", theme_color: "Cor do aplicativo", federation: "Modelo de federação",
  default_monthly_fee_cents: "Mensalidade padrão", enrollment_fee_enabled: "Cobrar taxa de matrícula", enrollment_fee_cents: "Taxa de matrícula",
  due_day_options: "Dias de vencimento", charge_lead_days: "Geração da mensalidade (dias antes)", adjustment_min_notice_days: "Aviso mínimo de reajuste (dias)",
  enabled: "Habilitada", window_days: "Janela (dias)", warning_days: "Aviso (dias)",
  default_duration_months: "Duração padrão (meses)", cancellation_notice_day: "Dia limite do aviso", exit_fee_mode: "Encargo de saída", exit_fee_cents: "Valor do encargo",
  rematriculation_after_months: "Rematrícula após (meses)", renewal_reminder_days: "Avisos de renovação (dias antes)",
  default_fee_cents: "Taxa padrão do exame", block_on_overdue: "Bloquear por inadimplência", almost_ready_pct: "Quase pronto (%)", allow_skip_grades: "Permitir pular graduação",
  form_label: "Termo da forma", level_label: "Termo do nível",
  medical_validity_days: "Validade do atestado (dias)", parq_validity_days: "Validade do PAR-Q (dias)", parq_reminder_days: "Lembretes do PAR-Q (dias antes)",
  payment_stages: "Régua de pagamento (dias)", overdue_weekly_from_day: "Lembrete semanal a partir de (dias)", due_soon_alert_days: "Alerta de vencimento próximo (dias)",
  badges: "Conquistas", min_days: "Tempo mínimo (dias)", min_presences: "Presenças mínimas", min_age_years: "Idade mínima (anos)", exam_fee_cents: "Taxa do exame",
  color_primary: "Cor principal", color_secondary: "Cor secundária", color_style: "Estilo da faixa", form_name: "Forma exigida", aliases: "Nomes alternativos"
};

const ENUM_LABELS: Record<string, string> = { one_monthly_fee: "Uma mensalidade", fixed: "Valor fixo", none: "Sem encargo", solid: "Lisa", tip: "Ponta", stripe: "Listra", half: "Meia", future_credit: "Crédito futuro", keep_charge: "Manter cobrança" };

export function sectionLabel(scope: RevisionScope, section: string): string {
  if (scope === "belt_ranks") return isRankKey(section) ? `Graduação: ${rankShortLabel(section)}` : "Graduação";
  return SECTION_LABELS[section] ?? section;
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

export function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return field.endsWith("_cents") ? formatBrl(value) : String(value);
  if (typeof value === "string") return ENUM_LABELS[value] ?? value;
  if (Array.isArray(value)) {
    if (field === "badges") return `${value.length} conquista${value.length === 1 ? "" : "s"}: ${value.map((item) => (item && typeof item === "object" ? `${(item as { title?: string }).title ?? "?"} (meta ${(item as { target?: number }).target ?? "?"})` : String(item))).join("; ")}`;
    return value.length === 0 ? "Nenhum" : value.map((item) => String(item)).join(", ");
  }
  return JSON.stringify(value);
}

type Json = Record<string, unknown> | null | undefined;

/**
 * Diferença campo a campo entre duas versões. Só entram os campos que mudaram. Campos pessoais da identidade viram
 * "Alterado"/"Preenchido"/"Removido" sem o valor.
 */
export function diffRevision(scope: RevisionScope, before: Json, after: Json): DiffRow[] {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const rows: DiffRow[] = [];
  for (const field of keys) {
    const was = before ? before[field] ?? null : null;
    const now = after ? after[field] ?? null : null;
    if (JSON.stringify(was) === JSON.stringify(now)) continue;
    if (scope === "settings" && REDACTED_FIELDS.has(field)) {
      rows.push({ field, label: fieldLabel(field), before: was == null ? "Vazio" : "Preenchido", after: now == null ? "Removido" : "Alterado" });
      continue;
    }
    rows.push({ field, label: fieldLabel(field), before: formatValue(field, was), after: formatValue(field, now) });
  }
  return rows;
}

export type HistoryEntry = {
  id: string;
  scope: RevisionScope;
  section: string;
  sectionLabel: string;
  revision: number;
  changedAt: string;
  reason: string | null;
  diff: DiffRow[];
  /** É a versão em vigor desta seção: não há o que restaurar. */
  isCurrent: boolean;
  /** Revisão mais recente da seção, para a concorrência otimista na restauração. */
  latestRevision: number;
};

export type RevisionRow = {
  $id: string;
  scope: string;
  section: string;
  revision: number;
  before_json?: string | null;
  after_json?: string | null;
  reason?: string | null;
  changed_at: string;
};

function parseJson(value: string | null | undefined): Json {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const parseRevisionJson = parseJson;

/** Linha do tempo (mais recente primeiro). Não leva o JSON bruto, o autor nem dados pessoais para o cliente. */
export function buildHistory(rows: readonly RevisionRow[]): HistoryEntry[] {
  const valid = rows.filter((row): row is RevisionRow & { scope: RevisionScope } => row.scope === "settings" || row.scope === "policy" || row.scope === "belt_ranks");
  const latest = new Map<string, number>();
  for (const row of valid) {
    const key = `${row.scope}:${row.section}`;
    latest.set(key, Math.max(latest.get(key) ?? 0, row.revision));
  }
  return [...valid]
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at) || b.revision - a.revision)
    .map((row) => {
      const latestRevision = latest.get(`${row.scope}:${row.section}`) ?? row.revision;
      return {
        id: row.$id,
        scope: row.scope,
        section: row.section,
        sectionLabel: sectionLabel(row.scope, row.section),
        revision: row.revision,
        changedAt: row.changed_at,
        reason: row.reason?.trim() || null,
        diff: diffRevision(row.scope, parseJson(row.before_json), parseJson(row.after_json)),
        isCurrent: row.revision === latestRevision,
        latestRevision
      };
    });
}
