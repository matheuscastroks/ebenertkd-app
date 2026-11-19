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
    adjustment_min_notice_days: toNumber(formData.get("adjustment_min_notice_days"))
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
    rematriculation_after_months: toNumber(formData.get("rematriculation_after_months"))
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
