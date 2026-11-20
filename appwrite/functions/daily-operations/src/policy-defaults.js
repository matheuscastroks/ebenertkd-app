/**
 * Políticas da academia usadas pela rotina diária. Espelha `src/features/academy/defaults.ts` e as regras de leitura
 * de `src/features/academy/schemas.ts` (a Function é implantada à parte e não importa código do app).
 * O teste `policy-parity.test.ts` garante que os defaults e a leitura tolerante continuam idênticos.
 *
 * Só entram as seções que a Function consome: billing, contract, compliance e notifications.
 */

export const DEFAULT_POLICIES = {
  billing: {
    default_monthly_fee_cents: 15000,
    enrollment_fee_enabled: false,
    enrollment_fee_cents: 0,
    due_day_options: [5, 10, 15, 20, 25, 30],
    charge_lead_days: 7,
    adjustment_min_notice_days: 30,
    late_fee_bps: 0,
    late_interest_bps_month: 0
  },
  contract: {
    default_duration_months: 12,
    cancellation_notice_day: 20,
    exit_fee_mode: "one_monthly_fee",
    exit_fee_cents: 0,
    rematriculation_after_months: 6,
    renewal_reminder_days: [30, 7]
  },
  compliance: {
    medical_validity_days: 365,
    medical_expiring_window_days: 30,
    parq_validity_days: 365,
    parq_expiring_window_days: 30,
    parq_reminder_days: [30, 7, 0]
  },
  notifications: {
    payment_stages: [-3, 0, 3],
    overdue_weekly_from_day: 10,
    due_soon_alert_days: 7
  }
};

const int = (min, max) => (value) => (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : undefined;
const bool = (value) => (typeof value === "boolean" ? value : undefined);
const oneOf = (...options) => (value) => (options.includes(value) ? value : undefined);
const list = (min, max, maxLength, minLength = 1) => (value) => {
  if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) return undefined;
  const numbers = value.map(int(min, max));
  if (numbers.some((item) => item === undefined) || new Set(numbers).size !== numbers.length) return undefined;
  return numbers;
};

/** Campo a campo, com os mesmos limites de `POLICY_FIELD_SCHEMAS`. */
const FIELD_PARSERS = {
  billing: {
    default_monthly_fee_cents: int(100, 1_000_000),
    enrollment_fee_enabled: bool,
    enrollment_fee_cents: int(0, 1_000_000),
    due_day_options: list(5, 30, 12),
    charge_lead_days: int(0, 30),
    adjustment_min_notice_days: int(0, 365),
    late_fee_bps: int(0, 1000),
    late_interest_bps_month: int(0, 1000)
  },
  contract: {
    default_duration_months: int(1, 60),
    cancellation_notice_day: int(1, 28),
    exit_fee_mode: oneOf("one_monthly_fee", "fixed", "none"),
    exit_fee_cents: int(0, 1_000_000),
    rematriculation_after_months: int(1, 60),
    renewal_reminder_days: list(1, 365, 6)
  },
  compliance: {
    medical_validity_days: int(30, 1825),
    medical_expiring_window_days: int(0, 365),
    parq_validity_days: int(30, 1825),
    parq_expiring_window_days: int(0, 365),
    parq_reminder_days: list(0, 365, 6, 0)
  },
  notifications: {
    payment_stages: list(-30, 60, 8, 0),
    overdue_weekly_from_day: int(1, 120),
    due_soon_alert_days: int(0, 30)
  }
};

const normalizeList = (field, value) => {
  if (!Array.isArray(value)) return value;
  if (field === "due_day_options") return [...value].sort((a, b) => a - b);
  if (field === "renewal_reminder_days" || field === "parq_reminder_days") return [...value].sort((a, b) => b - a);
  if (field === "payment_stages") return [...value].sort((a, b) => a - b);
  return value;
};

/** Regras entre campos: se alguma quebra, a seção inteira volta ao default (nunca um estado incoerente). */
const crossFieldBroken = (section, value) => {
  if (section === "billing") return value.enrollment_fee_enabled === true && value.enrollment_fee_cents <= 0;
  if (section === "contract") return value.exit_fee_mode === "fixed" && value.exit_fee_cents <= 0;
  if (section === "compliance") return value.parq_reminder_days.some((day) => day > value.parq_validity_days);
  if (section === "notifications") return value.payment_stages.some((day) => day > 0 && day >= value.overdue_weekly_from_day);
  return false;
};

const cloneDefault = (value) => (Array.isArray(value) ? [...value] : value);

/** Leitura tolerante de `data_json`: campo inválido volta ao default e os válidos são mantidos. */
export function parsePolicySection(section, dataJson) {
  const defaults = DEFAULT_POLICIES[section];
  let source = {};
  try {
    const decoded = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
    if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) source = decoded;
  } catch {
    source = {};
  }
  const result = {};
  for (const [field, parse] of Object.entries(FIELD_PARSERS[section])) {
    const parsed = field in source ? parse(source[field]) : undefined;
    result[field] = parsed === undefined ? cloneDefault(defaults[field]) : normalizeList(field, parsed);
  }
  if (crossFieldBroken(section, result)) {
    for (const field of Object.keys(FIELD_PARSERS[section])) result[field] = cloneDefault(defaults[field]);
  }
  return result;
}

/** Todas as seções da Function a partir das linhas de `academy_policies` (linha ausente = default). */
export function resolvePolicies(rows) {
  const bySection = new Map((rows ?? []).map((row) => [row.section, row]));
  return Object.fromEntries(Object.keys(DEFAULT_POLICIES).map((section) => [section, parsePolicySection(section, bySection.get(section)?.data_json)]));
}
