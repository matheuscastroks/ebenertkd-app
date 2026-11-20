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

export const ABSENT_DECISIONS = ["future_credit", "keep_charge"] as const;
export type AbsentDecision = (typeof ABSENT_DECISIONS)[number];

/** Regras de exame. Tempos e presenças por graduação ficam em `belt_rank_settings` (`rank-defaults.ts`). */
export const DEFAULT_EXAM_POLICY = {
  default_fee_cents: null as number | null,
  block_on_overdue: true,
  almost_ready_pct: 75,
  fallback_min_days: 90,
  fallback_min_presences: 24,
  allow_skip_grades: true,
  absent_default_decision: null as AbsentDecision | null
};

/** Termos gerais do sistema de faixas: "Poomsae"/"Tul" e "Gub"/"Gup"/"Geup". */
export const DEFAULT_BELTS_POLICY = {
  form_label: "Poomsae",
  level_label: "Gub"
};

/** Risco de evasão: limiares do painel de retenção (crítico e atenção) e a janela de frequência. */
export const DEFAULT_RETENTION_POLICY = {
  critical_consecutive_absences: 3,
  critical_days_without_presence: 21,
  critical_rate_pct: 50,
  critical_min_lessons: 4,
  warning_consecutive_absences: 2,
  warning_days_without_presence: 14,
  warning_rate_pct: 75,
  warning_min_lessons: 3,
  window_days: 30
};

/** Atestado médico e PAR-Q: validade, janela de alerta e dias dos lembretes (dias antes do vencimento; 0 = no dia). */
export const DEFAULT_COMPLIANCE_POLICY = {
  medical_validity_days: 365,
  medical_expiring_window_days: 30,
  parq_validity_days: 365,
  parq_expiring_window_days: 30,
  parq_reminder_days: [30, 7, 0] as number[]
};

/**
 * Régua de lembretes de pagamento: dias em relação ao vencimento (negativo = antes, 0 = no dia, positivo = atraso),
 * a partir de que dia de atraso o lembrete passa a ser semanal e o alerta de vencimento próximo no aplicativo.
 */
export const DEFAULT_NOTIFICATIONS_POLICY = {
  payment_stages: [-3, 0, 3] as number[],
  overdue_weekly_from_day: 10,
  due_soon_alert_days: 7
};

/** O que cada conquista mede. A métrica é fixa por conquista; o professor ajusta título, descrição e meta. */
export const BADGE_METRICS = ["total_presences", "best_week_streak", "perfect_months", "graduations", "tenure_months", "events_attended", "medals"] as const;
export type BadgeMetric = (typeof BADGE_METRICS)[number];

export const BADGE_METRIC_LABELS: Record<BadgeMetric, string> = {
  total_presences: "Presenças confirmadas",
  best_week_streak: "Semanas seguidas de treino",
  perfect_months: "Meses sem faltas",
  graduations: "Graduações conquistadas",
  tenure_months: "Meses de academia",
  events_attended: "Eventos e campeonatos de que participou",
  medals: "Medalhas em campeonatos"
};

export type BadgeDefinition = { id: string; title: string; description: string; metric: BadgeMetric; target: number };

export const DEFAULT_BADGES: BadgeDefinition[] = [
  { id: "first-lesson", title: "Primeiro treino", description: "Registre sua primeira presença no dojang.", metric: "total_presences", target: 1 },
  { id: "streak-4w", title: "Constância de 4 semanas", description: "Mantenha 4 semanas seguidas de treino.", metric: "best_week_streak", target: 4 },
  { id: "perfect-month", title: "Mês exemplar", description: "Complete um mês inteiro (4+ aulas) sem faltas.", metric: "perfect_months", target: 1 },
  { id: "lessons-25", title: "25 treinos concluídos", description: "Acumule 25 presenças confirmadas.", metric: "total_presences", target: 25 },
  { id: "lessons-50", title: "50 treinos no dojang", description: "Acumule 50 presenças confirmadas.", metric: "total_presences", target: 50 },
  { id: "lessons-100", title: "100 treinos no dojang", description: "Marca histórica de dedicação no tatame.", metric: "total_presences", target: 100 },
  { id: "first-graduation", title: "Primeira graduação", description: "Conquiste sua primeira troca de faixa em exame.", metric: "graduations", target: 1 },
  { id: "one-year", title: "1 ano de Taekwondo", description: "Complete 12 meses de prática na academia.", metric: "tenure_months", target: 12 },
  { id: "first-event", title: "Primeiro evento", description: "Participe de um campeonato, aulão ou seminário.", metric: "events_attended", target: 1 },
  { id: "first-medal", title: "Primeira medalha", description: "Suba ao pódio em um campeonato.", metric: "medals", target: 1 }
];

export const DEFAULT_GAMIFICATION_POLICY = {
  badges: DEFAULT_BADGES
};

export const DEFAULT_POLICIES = {
  billing: DEFAULT_BILLING_POLICY,
  access: DEFAULT_ACCESS_POLICY,
  contract: DEFAULT_CONTRACT_POLICY,
  exam: DEFAULT_EXAM_POLICY,
  belts: DEFAULT_BELTS_POLICY,
  retention: DEFAULT_RETENTION_POLICY,
  compliance: DEFAULT_COMPLIANCE_POLICY,
  notifications: DEFAULT_NOTIFICATIONS_POLICY,
  gamification: DEFAULT_GAMIFICATION_POLICY
};

export type PolicySection = keyof typeof DEFAULT_POLICIES;
export const POLICY_SECTIONS = Object.keys(DEFAULT_POLICIES) as PolicySection[];

export type BillingPolicy = typeof DEFAULT_BILLING_POLICY;
export type AccessPolicy = typeof DEFAULT_ACCESS_POLICY;
export type ContractPolicy = typeof DEFAULT_CONTRACT_POLICY;
export type ExamPolicy = typeof DEFAULT_EXAM_POLICY;
export type BeltsPolicy = typeof DEFAULT_BELTS_POLICY;
export type RetentionPolicy = typeof DEFAULT_RETENTION_POLICY;
export type CompliancePolicy = typeof DEFAULT_COMPLIANCE_POLICY;
export type NotificationsPolicy = typeof DEFAULT_NOTIFICATIONS_POLICY;
export type GamificationPolicy = typeof DEFAULT_GAMIFICATION_POLICY;
export type AcademyPolicies = {
  billing: BillingPolicy;
  access: AccessPolicy;
  contract: ContractPolicy;
  exam: ExamPolicy;
  belts: BeltsPolicy;
  retention: RetentionPolicy;
  compliance: CompliancePolicy;
  notifications: NotificationsPolicy;
  gamification: GamificationPolicy;
};
export type PolicyOf<S extends PolicySection> = AcademyPolicies[S];
