import { describe, expect, it } from "vitest";
import { DEFAULT_POLICIES } from "@/features/academy/defaults";
import { parsePolicyData } from "@/features/academy/schemas";
import { paymentReminderCopy, paymentReminderStage } from "@/features/notifications/payment-reminders";
import { shouldGenerateCompetence } from "@/features/billing/rules";
import { renewalEvent } from "@/features/contracts/rules";
import { computeParqExpirationDate, evaluateParqStatus } from "@/features/students/parq-rules";
import type { ParqSubmission } from "@/features/students/types";
import {
  DEFAULT_POLICIES as FUNCTION_DEFAULTS,
  parsePolicySection,
  resolvePolicies
} from "../../../appwrite/functions/daily-operations/src/policy-defaults.js";
import {
  parqExpiryDay,
  parqReminderStage,
  pendingReminder,
  reminderCopy,
  reminderStage,
  renewalReminderDays,
  shouldGenerate
} from "../../../appwrite/functions/daily-operations/src/reminders.js";

/**
 * A Function `daily-operations` é implantada à parte e não importa código do app: estes testes garantem que os defaults
 * e as regras que ela duplica (régua de pagamento, renovação, PAR-Q, geração da mensalidade) continuam idênticos.
 */
const SECTIONS = ["billing", "contract", "compliance", "notifications"] as const;

describe("defaults da Function = defaults do app", () => {
  it.each(SECTIONS)("seção %s", (section) => {
    expect(FUNCTION_DEFAULTS[section]).toEqual(DEFAULT_POLICIES[section]);
  });

  it("sem linhas o resolvePolicies devolve exatamente os defaults do app", () => {
    const resolved = resolvePolicies([]);
    for (const section of SECTIONS) expect(resolved[section]).toEqual(DEFAULT_POLICIES[section]);
  });
});

describe("leitura tolerante igual nos dois lados", () => {
  const samples: Record<(typeof SECTIONS)[number], unknown[]> = {
    billing: [
      { charge_lead_days: 14, default_monthly_fee_cents: 20000 },
      { charge_lead_days: 99 },
      { due_day_options: [10, 20] },
      { due_day_options: [10, 10] },
      { enrollment_fee_enabled: true, enrollment_fee_cents: 0 },
      { enrollment_fee_enabled: true, enrollment_fee_cents: 5000, charge_lead_days: 3 }
    ],
    contract: [
      { renewal_reminder_days: [60, 15, 3] },
      { renewal_reminder_days: [3, 60] },
      { renewal_reminder_days: [] },
      { exit_fee_mode: "fixed", exit_fee_cents: 0 },
      { exit_fee_mode: "fixed", exit_fee_cents: 9000, cancellation_notice_day: 10 },
      { cancellation_notice_day: 40 }
    ],
    compliance: [
      { parq_validity_days: 180, parq_reminder_days: [30, 14, 0] },
      { parq_reminder_days: [] },
      { parq_validity_days: 30, parq_reminder_days: [60] },
      { medical_validity_days: 10 },
      { parq_reminder_days: [7, 7] }
    ],
    notifications: [
      { payment_stages: [-5, -1, 0, 2], overdue_weekly_from_day: 7 },
      { payment_stages: [3, -3, 0] },
      { payment_stages: [3, 12] },
      { payment_stages: [] },
      { overdue_weekly_from_day: 0 },
      { due_soon_alert_days: 14 }
    ]
  };

  for (const section of SECTIONS) {
    it(`seção ${section}: valores válidos, inválidos e regras entre campos`, () => {
      for (const sample of samples[section]) {
        const json = JSON.stringify(sample);
        expect(parsePolicySection(section, json), json).toEqual(parsePolicyData(section, json));
      }
    });
  }

  it("JSON quebrado ou ausente vira default nos dois lados", () => {
    for (const section of SECTIONS) {
      for (const json of ["{quebrado", "[]", "null", undefined]) {
        expect(parsePolicySection(section, json)).toEqual(parsePolicyData(section, json));
      }
    }
  });
});

describe("régua de lembretes de pagamento igual nos dois lados", () => {
  const due = "2026-10-10T12:00:00.000Z";
  const policies = [
    DEFAULT_POLICIES.notifications,
    { payment_stages: [-5, -1, 0, 2], overdue_weekly_from_day: 7, due_soon_alert_days: 7 },
    { payment_stages: [], overdue_weekly_from_day: 1, due_soon_alert_days: 0 }
  ];

  it("etapa para cada dia de -10 a +45", () => {
    for (const policy of policies) {
      for (let offset = -10; offset <= 45; offset += 1) {
        const day = new Date(Date.UTC(2026, 9, 10 + offset)).toISOString().slice(0, 10);
        expect(reminderStage(due, day, policy), `${JSON.stringify(policy.payment_stages)} ${offset}`).toBe(paymentReminderStage(due, day, policy));
      }
    }
  });

  it("textos iguais para todas as etapas", () => {
    for (const stage of ["due_minus_5", "due_minus_1", "due_today", "overdue_plus_2", "overdue_plus_3", "overdue_weekly_1"]) {
      expect(reminderCopy(stage, "Mensalidade 2026-10")).toEqual(paymentReminderCopy(stage, "Mensalidade 2026-10"));
    }
    expect(reminderCopy("due_minus_5", "Mensalidade", 2)).toEqual(paymentReminderCopy("due_minus_5", "Mensalidade", 2));
  });

  it("a recuperação após uma pausa ainda respeita a régua customizada", () => {
    const policy = policies[1];
    expect(pendingReminder(due, ["2026-10-05", "2026-10-06", "2026-10-07"], "2026-10-07", policy)).toEqual({ stage: "due_minus_5", daysLeft: 3 });
    expect(pendingReminder(due, ["2026-10-12", "2026-10-13"], "2026-10-13", policy)).toEqual({ stage: "overdue_plus_2", daysLeft: null });
  });
});

describe("renovação, geração e PAR-Q iguais nos dois lados", () => {
  it("dias do aviso de renovação", () => {
    const reminderDays = [45, 15];
    const days = Array.from({ length: 60 }, (_, index) => new Date(Date.UTC(2026, 11, 1 + index)).toISOString().slice(0, 10));
    const fromFunction = renewalReminderDays("2027-01-31", days, "2027-01-02", reminderDays).map((item) => item.left);
    const fromApp = days.flatMap((day) => {
      const event = renewalEvent("2027-01-31", day, reminderDays);
      return event?.kind === "reminder" ? [event.days] : [];
    });
    expect(fromFunction).toEqual(fromApp);
    expect(fromFunction.length).toBeGreaterThan(0);
  });

  it("antecedência de geração da mensalidade", () => {
    for (const lead of [0, 3, 7, 21]) {
      for (const day of ["2026-06-09", "2026-06-10", "2026-06-24", "2026-06-28", "2026-07-01"]) {
        expect(shouldGenerate("2026-07", day, lead), `${lead} ${day}`).toBe(shouldGenerateCompetence("2026-07", day, lead));
      }
    }
  });

  it("vencimento do PAR-Q e etapa do lembrete", () => {
    for (const validity of [180, 365, 730]) {
      const signed = "2026-06-01T12:00:00.000Z";
      const submission = { signed_at: signed, expires_at: computeParqExpirationDate(signed, validity), answers_json: "{}", $id: "q" } as unknown as ParqSubmission;
      const policy = { parq_validity_days: validity, parq_expiring_window_days: 30 };
      expect(parqExpiryDay(signed, validity)).toBe(evaluateParqStatus(submission, "2026-11-18", policy).expiresAt);
    }
    expect(parqReminderStage(30)).toBe("30d");
    expect(parqReminderStage(7)).toBe("7d");
    expect(parqReminderStage(0)).toBe("expired");
    expect(parqReminderStage(10)).toBeNull();
    expect(parqReminderStage(14, [14, 0])).toBe("14d");
  });
});
