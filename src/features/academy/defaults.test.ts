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
