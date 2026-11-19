/**
 * Fonte única dos valores que HOJE estão fixos no código e passam a ser configuráveis.
 * Regra de ouro: cada default é exatamente o valor que o sistema já usava, então uma instalação
 * sem nenhuma configuração salva se comporta como antes. Módulo puro (sem servidor, sem Appwrite).
 *
 * Etapas seguintes (faixas, exames, retenção, conformidade, notificações, conquistas) estendem
 * `DEFAULT_POLICIES` com novas seções em vez de criar outra fonte de defaults.
 */

export const POLICY_SCHEMA_VERSION = 1;

export type DocumentType = "cnpj" | "cpf";

export type AcademyIdentity = {
  legal_name: string;
  display_name: string;
  short_name: string;
  document_type: DocumentType | null;
  document_number: string | null;
  address_line: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone_whatsapp: string | null;
  contact_email: string | null;
  instagram_handle: string | null;
  professor_name: string | null;
  professor_title: string | null;
  professor_graduation: string | null;
  privacy_contact: string | null;
  dpo_name: string | null;
  logo_file_id: string | null;
  theme_color: string;
  federation: "cbtkd" | "itf" | "kukkiwon" | "custom" | null;
  timezone: string;
  setup_completed_at: string | null;
};

export const DEFAULT_ACADEMY_IDENTITY: AcademyIdentity = {
  legal_name: "Ebener Taekwondo",
  display_name: "Ebener Taekwondo",
  short_name: "Ebener TKD",
  document_type: null,
  document_number: null,
  address_line: null,
  address_complement: null,
  address_district: null,
  address_city: null,
  address_state: null,
  address_zip: null,
  phone_whatsapp: null,
  contact_email: null,
  instagram_handle: null,
  professor_name: "Ebener Santos",
  professor_title: "Mestre",
  professor_graduation: null,
  privacy_contact: null,
  dpo_name: null,
  logo_file_id: null,
  theme_color: "#f59300",
  federation: null,
  timezone: "America/Sao_Paulo",
  setup_completed_at: null
};

/** Dias de vencimento aceitos pela coluna `requested_due_day`/`approved_due_day` (schema.ts: 5 a 30). */
export const DUE_DAY_MIN = 5;
export const DUE_DAY_MAX = 30;

export const DEFAULT_BILLING_POLICY = {
  default_monthly_fee_cents: 15000,
  enrollment_fee_enabled: false,
  enrollment_fee_cents: 0,
  due_day_options: [5, 10, 15, 20, 25, 30] as number[],
  charge_lead_days: 7,
  adjustment_min_notice_days: 30,
  late_fee_bps: 0,
  late_interest_bps_month: 0
};

export const DEFAULT_ACCESS_POLICY = {
  enabled: true,
  window_days: 30,
  warning_days: 5
};

export const EXIT_FEE_MODES = ["one_monthly_fee", "fixed", "none"] as const;
export type ExitFeeMode = (typeof EXIT_FEE_MODES)[number];

export const DEFAULT_CONTRACT_POLICY = {
  default_duration_months: 12,
  cancellation_notice_day: 20,
  exit_fee_mode: "one_monthly_fee" as ExitFeeMode,
  exit_fee_cents: 0,
  rematriculation_after_months: 6,
  renewal_reminder_days: [30, 7] as number[]
};

export const DEFAULT_POLICIES = {
  billing: DEFAULT_BILLING_POLICY,
  access: DEFAULT_ACCESS_POLICY,
  contract: DEFAULT_CONTRACT_POLICY
};

export type PolicySection = keyof typeof DEFAULT_POLICIES;
export const POLICY_SECTIONS = Object.keys(DEFAULT_POLICIES) as PolicySection[];

export type BillingPolicy = typeof DEFAULT_BILLING_POLICY;
export type AccessPolicy = typeof DEFAULT_ACCESS_POLICY;
export type ContractPolicy = typeof DEFAULT_CONTRACT_POLICY;
export type AcademyPolicies = { billing: BillingPolicy; access: AccessPolicy; contract: ContractPolicy };
export type PolicyOf<S extends PolicySection> = AcademyPolicies[S];
