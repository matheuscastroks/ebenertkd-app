export type PolicyDefaults = {
  billing: {
    default_monthly_fee_cents: number;
    enrollment_fee_enabled: boolean;
    enrollment_fee_cents: number;
    due_day_options: number[];
    charge_lead_days: number;
    adjustment_min_notice_days: number;
    late_fee_bps: number;
    late_interest_bps_month: number;
  };
  contract: {
    default_duration_months: number;
    cancellation_notice_day: number;
    exit_fee_mode: "one_monthly_fee" | "fixed" | "none";
    exit_fee_cents: number;
    rematriculation_after_months: number;
    renewal_reminder_days: number[];
  };
  compliance: {
    medical_validity_days: number;
    medical_expiring_window_days: number;
    parq_validity_days: number;
    parq_expiring_window_days: number;
    parq_reminder_days: number[];
  };
  notifications: {
    payment_stages: number[];
    overdue_weekly_from_day: number;
    due_soon_alert_days: number;
  };
};

export const DEFAULT_POLICIES: PolicyDefaults;
export function parsePolicySection<S extends keyof PolicyDefaults>(section: S, dataJson: unknown): PolicyDefaults[S];
export function resolvePolicies(rows: ReadonlyArray<{ section: string; data_json?: string }> | null | undefined): PolicyDefaults;
