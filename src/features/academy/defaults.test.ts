import { describe, expect, it } from "vitest";
import { ACADEMY_NAME } from "@/features/billing/adjustment-message";
import { MIN_NOTICE_DAYS } from "@/features/billing/adjustment-rules";
import { MONTHLY_ACCESS_WARNING_DAYS, MONTHLY_ACCESS_WINDOW_DAYS } from "@/features/billing/access-lock-rules";
import { PUSH_TITLE } from "@/features/notifications/push-payload";
import { DUE_DAY_OPTIONS } from "@/features/students/options";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_POLICIES } from "@/features/academy/defaults";

/**
 * Qualquer mudança acidental de valor aqui muda o comportamento de uma instalação sem configuração.
 * Os números abaixo são os que estavam fixos no código antes da área "Configurações da academia".
 */
describe("defaults = valores atuais do código", () => {
  it("identidade", () => {
    expect(DEFAULT_ACADEMY_IDENTITY).toEqual({
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
    });
  });

  it("políticas financeira, de acesso e de contrato", () => {
    expect(DEFAULT_POLICIES).toEqual({
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
      access: { enabled: true, window_days: 30, warning_days: 5 },
      contract: {
        default_duration_months: 12,
        cancellation_notice_day: 20,
        exit_fee_mode: "one_monthly_fee",
        exit_fee_cents: 0,
        rematriculation_after_months: 6,
        renewal_reminder_days: [30, 7]
      },
      exam: {
        default_fee_cents: null,
        block_on_overdue: true,
        almost_ready_pct: 75,
        fallback_min_days: 90,
        fallback_min_presences: 24,
        allow_skip_grades: true,
        absent_default_decision: null
      },
      belts: { form_label: "Poomsae", level_label: "Gub" },
      retention: {
        critical_consecutive_absences: 3,
        critical_days_without_presence: 21,
        critical_rate_pct: 50,
        critical_min_lessons: 4,
        warning_consecutive_absences: 2,
        warning_days_without_presence: 14,
        warning_rate_pct: 75,
        warning_min_lessons: 3,
        window_days: 30
      },
      compliance: {
        medical_validity_days: 365,
        medical_expiring_window_days: 30,
        parq_validity_days: 365,
        parq_expiring_window_days: 30,
        parq_reminder_days: [30, 7, 0]
      },
      notifications: { payment_stages: [-3, 0, 3], overdue_weekly_from_day: 10, due_soon_alert_days: 7 },
      gamification: {
        badges: [
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
        ]
      }
    });
  });

  it("as constantes existentes reexportam os defaults", () => {
    expect(MONTHLY_ACCESS_WINDOW_DAYS).toBe(DEFAULT_POLICIES.access.window_days);
    expect(MONTHLY_ACCESS_WARNING_DAYS).toBe(DEFAULT_POLICIES.access.warning_days);
    expect(MIN_NOTICE_DAYS).toBe(DEFAULT_POLICIES.billing.adjustment_min_notice_days);
    expect([...DUE_DAY_OPTIONS]).toEqual(DEFAULT_POLICIES.billing.due_day_options);
    expect(PUSH_TITLE).toBe(DEFAULT_ACADEMY_IDENTITY.short_name);
    expect(ACADEMY_NAME).toBe(DEFAULT_ACADEMY_IDENTITY.short_name);
  });
});
