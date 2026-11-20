import { reaisToCents } from "@/lib/money";

/** Conversões puras de FormData (reais, switches, listas) para o formato dos schemas. Valor inválido vira NaN e falha na validação. */

function moneyToCents(value: FormDataEntryValue | null): number {
  if (value == null || String(value).trim() === "") return 0;
  try {
    return reaisToCents(value);
  } catch {
    return Number.NaN;
  }
}

function toNumber(value: FormDataEntryValue | null): number {
  if (value == null || String(value).trim() === "") return Number.NaN;
  return Number(String(value).replace(",", "."));
}

const isOn = (value: FormDataEntryValue | null) => value === "on" || value === "true";

/** Lista de números digitada como "30, 7, 0" (vírgula, ponto e vírgula ou espaço). Vazio = lista vazia; item inválido vira NaN e falha na validação. */
export function parseNumberList(value: FormDataEntryValue | null): number[] {
  const text = value == null ? "" : String(value);
  return text
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .map((item) => Number(item));
}

export function identityFormToInput(formData: FormData): Record<string, unknown> {
  const keys = [
    "legal_name", "display_name", "short_name", "document_type", "document_number", "address_line", "address_complement",
    "address_district", "address_city", "address_state", "address_zip", "phone_whatsapp", "contact_email", "instagram_handle",
    "professor_name", "professor_title", "professor_graduation", "privacy_contact", "dpo_name", "theme_color"
  ];
  const input = Object.fromEntries(keys.map((key) => [key, formData.get(key) ?? ""]));
  if (input.document_type === "none") input.document_type = "";
  return input;
}

export function billingFormToPatch(formData: FormData): Record<string, unknown> {
  return {
    default_monthly_fee_cents: moneyToCents(formData.get("default_monthly_fee")),
    enrollment_fee_enabled: isOn(formData.get("enrollment_fee_enabled")),
    enrollment_fee_cents: moneyToCents(formData.get("enrollment_fee")),
    due_day_options: formData.getAll("due_day_options").map((value) => Number(value)),
    adjustment_min_notice_days: toNumber(formData.get("adjustment_min_notice_days")),
    // O assistente e outras telas podem não exibir este campo: nesse caso mantém o valor salvo.
    ...(formData.has("charge_lead_days") ? { charge_lead_days: toNumber(formData.get("charge_lead_days")) } : {})
  };
}

export function accessFormToPatch(formData: FormData): Record<string, unknown> {
  // Com o bloqueio desligado os campos de dias não são enviados: mantêm o valor salvo.
  const patch: Record<string, unknown> = { enabled: isOn(formData.get("enabled")) };
  if (formData.has("window_days")) patch.window_days = toNumber(formData.get("window_days"));
  if (formData.has("warning_days")) patch.warning_days = toNumber(formData.get("warning_days"));
  return patch;
}

export function contractFormToPatch(formData: FormData): Record<string, unknown> {
  return {
    default_duration_months: toNumber(formData.get("default_duration_months")),
    cancellation_notice_day: toNumber(formData.get("cancellation_notice_day")),
    exit_fee_mode: String(formData.get("exit_fee_mode") ?? ""),
    exit_fee_cents: moneyToCents(formData.get("exit_fee")),
    rematriculation_after_months: toNumber(formData.get("rematriculation_after_months")),
    ...(formData.has("renewal_reminder_days") ? { renewal_reminder_days: parseNumberList(formData.get("renewal_reminder_days")) } : {})
  };
}

export function examFormToPatch(formData: FormData): Record<string, unknown> {
  const fee = formData.get("default_fee");
  const decision = String(formData.get("absent_default_decision") ?? "");
  return {
    // Campo vazio = sem taxa padrão (a banca informa a taxa).
    default_fee_cents: fee == null || String(fee).trim() === "" ? null : moneyToCents(fee),
    block_on_overdue: isOn(formData.get("block_on_overdue")),
    almost_ready_pct: toNumber(formData.get("almost_ready_pct")),
    fallback_min_days: toNumber(formData.get("fallback_min_days")),
    fallback_min_presences: toNumber(formData.get("fallback_min_presences")),
    allow_skip_grades: isOn(formData.get("allow_skip_grades")),
    absent_default_decision: decision === "" || decision === "none" ? null : decision
  };
}

export function beltsFormToPatch(formData: FormData): Record<string, unknown> {
  return {
    form_label: String(formData.get("form_label") ?? ""),
    level_label: String(formData.get("level_label") ?? "")
  };
}

export function retentionFormToPatch(formData: FormData): Record<string, unknown> {
  const keys = [
    "critical_consecutive_absences", "critical_days_without_presence", "critical_rate_pct", "critical_min_lessons",
    "warning_consecutive_absences", "warning_days_without_presence", "warning_rate_pct", "warning_min_lessons", "window_days"
  ];
  return Object.fromEntries(keys.map((key) => [key, toNumber(formData.get(key))]));
}

export function complianceFormToPatch(formData: FormData): Record<string, unknown> {
  return {
    medical_validity_days: toNumber(formData.get("medical_validity_days")),
    medical_expiring_window_days: toNumber(formData.get("medical_expiring_window_days")),
    parq_validity_days: toNumber(formData.get("parq_validity_days")),
    parq_expiring_window_days: toNumber(formData.get("parq_expiring_window_days")),
    parq_reminder_days: parseNumberList(formData.get("parq_reminder_days"))
  };
}

export function notificationsFormToPatch(formData: FormData): Record<string, unknown> {
  return {
    payment_stages: parseNumberList(formData.get("payment_stages")),
    overdue_weekly_from_day: toNumber(formData.get("overdue_weekly_from_day")),
    due_soon_alert_days: toNumber(formData.get("due_soon_alert_days"))
  };
}

/** As conquistas viajam como JSON em um campo oculto (a tela edita título, descrição e meta; a métrica é fixa). */
export function gamificationFormToPatch(formData: FormData): Record<string, unknown> {
  try {
    return { badges: JSON.parse(String(formData.get("badges_json") ?? "[]")) as unknown };
  } catch {
    return { badges: null };
  }
}
