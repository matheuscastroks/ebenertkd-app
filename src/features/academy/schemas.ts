import { z } from "zod";
import {
  DEFAULT_ACADEMY_IDENTITY,
  DEFAULT_POLICIES,
  DUE_DAY_MAX,
  DUE_DAY_MIN,
  EXIT_FEE_MODES,
  POLICY_SCHEMA_VERSION,
  type AcademyPolicies,
  type PolicySection
} from "@/features/academy/defaults";
import { isHexColor, isValidDocument, normalizeHexColor, onlyDigits } from "@/features/academy/validators";
import { cleanPhoneDigits } from "@/lib/phone";

/* ------------------------------------------------------------------ identidade */

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? (value.trim() === "" ? null : value.trim()) : (value ?? null)),
    z.string().max(max).nullable()
  );

export const academyIdentitySchema = z
  .object({
    legal_name: z.string().trim().min(3, "Informe o nome legal").max(160),
    display_name: z.string().trim().min(2, "Informe o nome de exibição").max(96),
    short_name: z.string().trim().min(2, "Informe o nome curto").max(24, "Use até 24 caracteres"),
    document_type: z.preprocess((value) => (value === "" ? null : (value ?? null)), z.enum(["cnpj", "cpf"]).nullable()),
    document_number: z.preprocess(
      (value) => (typeof value === "string" ? (onlyDigits(value) || null) : (value ?? null)),
      z.string().max(14).nullable()
    ),
    address_line: nullableText(160),
    address_complement: nullableText(96),
    address_district: nullableText(96),
    address_city: nullableText(96),
    address_state: z.preprocess(
      (value) => (typeof value === "string" ? (value.trim().toUpperCase() || null) : (value ?? null)),
      z.string().regex(/^[A-Z]{2}$/, "Use a sigla do estado").nullable()
    ),
    address_zip: z.preprocess(
      (value) => (typeof value === "string" ? (onlyDigits(value) || null) : (value ?? null)),
      z.string().regex(/^\d{8}$/, "CEP com 8 dígitos").nullable()
    ),
    phone_whatsapp: z.preprocess(
      (value) => (typeof value === "string" ? (cleanPhoneDigits(value) || null) : (value ?? null)),
      z.string().regex(/^\d{10,11}$/, "Telefone com DDD").nullable()
    ),
    contact_email: z.preprocess(
      (value) => (typeof value === "string" ? (value.trim().toLowerCase() || null) : (value ?? null)),
      z.string().max(320).email("E-mail inválido").nullable()
    ),
    instagram_handle: z.preprocess(
      (value) => (typeof value === "string" ? (value.trim().replace(/^@/, "") || null) : (value ?? null)),
      z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Usuário do Instagram inválido").nullable()
    ),
    professor_name: nullableText(128),
    professor_title: nullableText(32),
    professor_graduation: nullableText(64),
    privacy_contact: nullableText(320),
    dpo_name: nullableText(128),
    theme_color: z.preprocess(
      (value) => (typeof value === "string" ? normalizeHexColor(value) || DEFAULT_ACADEMY_IDENTITY.theme_color : DEFAULT_ACADEMY_IDENTITY.theme_color),
      z.string().refine(isHexColor, "Cor inválida (use #RRGGBB)")
    ),
    federation: z.preprocess((value) => (value === "" ? null : (value ?? null)), z.enum(["cbtkd", "itf", "kukkiwon", "custom"]).nullable())
  })
  .superRefine((value, context) => {
    if (value.document_number && !value.document_type) {
      context.addIssue({ code: "custom", path: ["document_type"], message: "Escolha CNPJ ou CPF" });
    } else if (value.document_type && value.document_number && !isValidDocument(value.document_type, value.document_number)) {
      context.addIssue({ code: "custom", path: ["document_number"], message: `${value.document_type.toUpperCase()} inválido` });
    } else if (value.document_type && !value.document_number) {
      context.addIssue({ code: "custom", path: ["document_number"], message: "Informe o número do documento" });
    }
  });

export type AcademyIdentityInput = z.infer<typeof academyIdentitySchema>;

/* ------------------------------------------------------------------ políticas */

const dayList = (min: number, max: number, maxLength: number) =>
  z
    .array(z.coerce.number().int().min(min).max(max))
    .min(1)
    .max(maxLength)
    .refine((list) => new Set(list).size === list.length, "Dias repetidos");

/** Campo a campo: cada chave tem o seu schema, para a leitura aproveitar os campos válidos. */
export const POLICY_FIELD_SCHEMAS = {
  billing: {
    default_monthly_fee_cents: z.coerce.number().int().min(100).max(1_000_000),
    enrollment_fee_enabled: z.boolean(),
    enrollment_fee_cents: z.coerce.number().int().min(0).max(1_000_000),
    due_day_options: dayList(DUE_DAY_MIN, DUE_DAY_MAX, 12),
    charge_lead_days: z.coerce.number().int().min(0).max(30),
    adjustment_min_notice_days: z.coerce.number().int().min(0).max(365),
    late_fee_bps: z.coerce.number().int().min(0).max(1000),
    late_interest_bps_month: z.coerce.number().int().min(0).max(1000)
  },
  access: {
    enabled: z.boolean(),
    window_days: z.coerce.number().int().min(1).max(120),
    warning_days: z.coerce.number().int().min(0).max(60)
  },
  contract: {
    default_duration_months: z.coerce.number().int().min(1).max(60),
    cancellation_notice_day: z.coerce.number().int().min(1).max(28),
    exit_fee_mode: z.enum(EXIT_FEE_MODES),
    exit_fee_cents: z.coerce.number().int().min(0).max(1_000_000),
    rematriculation_after_months: z.coerce.number().int().min(1).max(60),
    renewal_reminder_days: dayList(1, 365, 6)
  }
} as const satisfies Record<PolicySection, Record<string, z.ZodType>>;

type PolicyRecord = Record<string, unknown>;
export type PolicyIssue = { field: string; message: string };

/** Regras entre campos. Usada na gravação (vira erro) e na leitura (volta ao default). */
export function crossFieldIssues(section: PolicySection, value: PolicyRecord): PolicyIssue[] {
  const issues: PolicyIssue[] = [];
  if (section === "billing" && value.enrollment_fee_enabled === true && Number(value.enrollment_fee_cents) <= 0) {
    issues.push({ field: "enrollment_fee_cents", message: "Informe o valor da taxa de matrícula" });
  }
  if (section === "access" && Number(value.window_days) < Number(value.warning_days)) {
    issues.push({ field: "warning_days", message: "O aviso não pode ser maior que a janela de acesso" });
  }
  if (section === "contract" && value.exit_fee_mode === "fixed" && Number(value.exit_fee_cents) <= 0) {
    issues.push({ field: "exit_fee_cents", message: "Informe o valor fixo do encargo" });
  }
  return issues;
}

function normalizeList(field: string, value: unknown) {
  if (!Array.isArray(value)) return value;
  if (field === "due_day_options") return [...value].sort((a, b) => a - b);
  if (field === "renewal_reminder_days") return [...value].sort((a, b) => b - a);
  return value;
}

function cloneDefault<T>(value: T): T {
  return Array.isArray(value) ? ([...value] as T) : value;
}

export class PolicyValidationError extends Error {
  constructor(readonly issues: PolicyIssue[]) {
    super("invalid_policy");
  }
}

/** Gravação: estrita. Campo inválido ou regra entre campos quebrada vira `PolicyValidationError`. */
export function parsePolicyInput<S extends PolicySection>(section: S, raw: unknown): AcademyPolicies[S] {
  const source = (raw && typeof raw === "object" ? raw : {}) as PolicyRecord;
  const shape = POLICY_FIELD_SCHEMAS[section] as Record<string, z.ZodType>;
  const defaults = DEFAULT_POLICIES[section] as PolicyRecord;
  const result: PolicyRecord = {};
  const issues: PolicyIssue[] = [];
  for (const [field, schema] of Object.entries(shape)) {
    const parsed = schema.safeParse(field in source ? source[field] : defaults[field]);
    if (parsed.success) result[field] = normalizeList(field, parsed.data);
    else issues.push({ field, message: parsed.error.issues[0]?.message ?? "Valor inválido" });
  }
  if (issues.length === 0) issues.push(...crossFieldIssues(section, result));
  if (issues.length > 0) throw new PolicyValidationError(issues);
  return result as AcademyPolicies[S];
}

/**
 * Leitura: tolerante. `data_json` ausente, inválido ou parcial nunca quebra o app: cada campo
 * inválido volta ao default e os válidos são mantidos.
 */
export function parsePolicyData<S extends PolicySection>(section: S, dataJson: unknown, schemaVersion: number = POLICY_SCHEMA_VERSION): AcademyPolicies[S] {
  void schemaVersion; // v1 é a única versão; migrações futuras entram aqui.
  const defaults = DEFAULT_POLICIES[section] as PolicyRecord;
  let source: PolicyRecord = {};
  try {
    const decoded = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
    if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) source = decoded as PolicyRecord;
  } catch {
    source = {};
  }
  const shape = POLICY_FIELD_SCHEMAS[section] as Record<string, z.ZodType>;
  const result: PolicyRecord = {};
  for (const [field, schema] of Object.entries(shape)) {
    const parsed = field in source ? schema.safeParse(source[field]) : null;
    result[field] = parsed?.success ? normalizeList(field, parsed.data) : cloneDefault(defaults[field]);
  }
  // Regra entre campos quebrada: a seção inteira volta ao default (nunca um estado incoerente).
  if (crossFieldIssues(section, result).length > 0) {
    for (const field of Object.keys(shape)) result[field] = cloneDefault(defaults[field]);
  }
  return result as AcademyPolicies[S];
}

export function defaultPolicySection<S extends PolicySection>(section: S): AcademyPolicies[S] {
  return parsePolicyData(section, null);
}

export function isPolicySection(value: unknown): value is PolicySection {
  return typeof value === "string" && value in DEFAULT_POLICIES;
}
