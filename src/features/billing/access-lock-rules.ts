import { effectiveChargeStatus } from "@/features/billing/rules";
import type { Charge, Payment } from "@/features/billing/types";
import type { Enrollment } from "@/features/students/types";
import { DEFAULT_ACCESS_POLICY, type AccessPolicy } from "@/features/academy/defaults";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export const MONTHLY_ACCESS_WINDOW_DAYS = DEFAULT_ACCESS_POLICY.window_days;
export const MONTHLY_ACCESS_WARNING_DAYS = DEFAULT_ACCESS_POLICY.warning_days;

export type StudentAppAccessStatus =
  | "not_applicable"
  | "active"
  | "expiring_soon"
  | "proof_under_review"
  | "override"
  | "locked";

export type StudentAppAccessLockReason =
  | "monthly_cycle_expired"
  | "overdue_without_payment"
  | null;

export type StudentAppAccessState = {
  locked: boolean;
  status: StudentAppAccessStatus;
  reason: StudentAppAccessLockReason;
  lastPaidAt: string | null;
  accessValidUntil: string | null;
  overrideUntil: string | null;
  daysRemaining: number | null;
  daysOverdue: number;
  /** Janela de acesso aplicada (política da academia); usada nos textos. */
  windowDays: number;
  /** `false` quando o professor desligou o bloqueio por mensalidade. */
  enabled: boolean;
};

function addDaysIso(isoDay: string, days: number): string {
  const base = Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(base)) return isoDay;
  return new Date(base + days * 86400000).toISOString().slice(0, 10);
}

/**
 * Avalia se o acesso mensal do aluno ao aplicativo está ativo ou pausado (regra dos 30 dias após pagamento).
 *
 * Regras de segurança e justiça:
 * - Nunca bloqueia alunos em fase de matrícula (`draft`, `submitted`, `under_review`, `awaiting_signature`).
 * - Nunca bloqueia enquanto houver comprovante mensal em conferência (`proof_under_review`).
 * - Respeita liberação temporária manual (`access_override_until`) concedida pelo professor.
 * - Após confirmação de pagamento mensal (`paid_at`), garante 30 dias corridos de acesso ao app.
 * - Passados mais de 30 dias sem novo pagamento confirmado (ou com mensalidade em atraso sem pagamento vigente),
 *   pausa o acesso às demais áreas até o envio do comprovante ou confirmação pelo professor.
 */
export function evaluateStudentAppAccess(input: {
  enrollment: Enrollment | null | undefined;
  charges: Charge[];
  payments: Payment[];
  referenceDate?: string;
  policy?: AccessPolicy;
}): StudentAppAccessState {
  const enrollment = input.enrollment;
  const policy = input.policy ?? DEFAULT_ACCESS_POLICY;
  const MONTHLY_ACCESS_WINDOW_DAYS = policy.window_days;
  const MONTHLY_ACCESS_WARNING_DAYS = policy.warning_days;
  if (!policy.enabled || !enrollment || (enrollment.status !== "active" && enrollment.status !== "awaiting_renewal")) {
    return {
      locked: false,
      status: "not_applicable",
      reason: null,
      lastPaidAt: null,
      accessValidUntil: null,
      overrideUntil: enrollment?.access_override_until?.slice(0, 10) ?? null,
      daysRemaining: null,
      daysOverdue: 0,
      windowDays: policy.window_days,
      enabled: policy.enabled,
    };
  }

  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const referenceIso = `${referenceDay}T12:00:00.000Z`;
  const overrideDay = enrollment.access_override_until?.slice(0, 10) ?? null;

  const monthlyCharges = input.charges
    .filter((charge) => charge.charge_type === "monthly_fee" && charge.status !== "cancelled")
    .map((charge) => ({
      ...charge,
      effectiveStatus: effectiveChargeStatus(charge.status, charge.due_date, referenceIso),
    }));

  const monthlyChargeIds = new Set(monthlyCharges.map((charge) => charge.$id));

  const confirmedMonthlyPayments = input.payments
    .filter(
      (payment) =>
        payment.status === "confirmed" && monthlyChargeIds.has(payment.charge_id)
    )
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  const latestPaidAt = confirmedMonthlyPayments[0]?.paid_at.slice(0, 10) ?? null;

  if (overrideDay && overrideDay >= referenceDay) {
    return {
      locked: false,
      status: "override",
      reason: null,
      lastPaidAt: latestPaidAt,
      accessValidUntil: overrideDay,
      overrideUntil: overrideDay,
      daysRemaining: daysBetweenIsoDates(referenceDay, overrideDay),
      daysOverdue: 0,
      windowDays: policy.window_days,
      enabled: policy.enabled,
    };
  }

  const hasProofUnderReview = monthlyCharges.some(
    (charge) => charge.effectiveStatus === "proof_under_review"
  );
  if (hasProofUnderReview) {
    return {
      locked: false,
      status: "proof_under_review",
      reason: null,
      lastPaidAt: latestPaidAt,
      accessValidUntil: latestPaidAt ? addDaysIso(latestPaidAt, MONTHLY_ACCESS_WINDOW_DAYS) : null,
      overrideUntil: overrideDay,
      daysRemaining: latestPaidAt
        ? daysBetweenIsoDates(referenceDay, addDaysIso(latestPaidAt, MONTHLY_ACCESS_WINDOW_DAYS))
        : null,
      daysOverdue: 0,
      windowDays: policy.window_days,
      enabled: policy.enabled,
    };
  }

  if (latestPaidAt) {
    const cycleEndDay = addDaysIso(latestPaidAt, MONTHLY_ACCESS_WINDOW_DAYS);
    const daysRemaining = daysBetweenIsoDates(referenceDay, cycleEndDay);

    if (daysRemaining >= 0) {
      return {
        locked: false,
        status: daysRemaining <= MONTHLY_ACCESS_WARNING_DAYS ? "expiring_soon" : "active",
        reason: null,
        lastPaidAt: latestPaidAt,
        accessValidUntil: cycleEndDay,
        overrideUntil: overrideDay,
        daysRemaining,
        daysOverdue: 0,
        windowDays: policy.window_days,
        enabled: policy.enabled,
      };
    }

    return {
      locked: true,
      status: "locked",
      reason: "monthly_cycle_expired",
      lastPaidAt: latestPaidAt,
      accessValidUntil: cycleEndDay,
      overrideUntil: overrideDay,
      daysRemaining,
      daysOverdue: Math.abs(daysRemaining),
      windowDays: policy.window_days,
      enabled: policy.enabled,
    };
  }

  const overdueMonthlyCharges = monthlyCharges
    .filter((charge) => charge.effectiveStatus === "overdue")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  if (overdueMonthlyCharges.length > 0) {
    const oldestDueDay = overdueMonthlyCharges[0].due_date.slice(0, 10);
    const daysOverdue = Math.max(1, daysBetweenIsoDates(oldestDueDay, referenceDay));
    return {
      locked: true,
      status: "locked",
      reason: "overdue_without_payment",
      lastPaidAt: null,
      accessValidUntil: oldestDueDay,
      overrideUntil: overrideDay,
      daysRemaining: -daysOverdue,
      daysOverdue,
      windowDays: policy.window_days,
      enabled: policy.enabled,
    };
  }

  const nextPending = monthlyCharges
    .filter((charge) => charge.effectiveStatus === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const nextDueDay = nextPending?.due_date.slice(0, 10) ?? null;
  const daysRemaining = nextDueDay ? daysBetweenIsoDates(referenceDay, nextDueDay) : null;

  return {
    locked: false,
    status:
      daysRemaining !== null && daysRemaining <= MONTHLY_ACCESS_WARNING_DAYS
        ? "expiring_soon"
        : "active",
    reason: null,
    lastPaidAt: null,
    accessValidUntil: nextDueDay,
    overrideUntil: overrideDay,
    daysRemaining,
    daysOverdue: 0,
    windowDays: policy.window_days,
    enabled: policy.enabled,
  };
}

/** Frase sobre o acesso liberado após um pagamento; vazia quando o bloqueio está desligado. */
export function accessGrantedSentence(policy: Pick<AccessPolicy, "enabled" | "window_days">): string {
  return policy.enabled ? ` Seu acesso ao aplicativo está liberado por ${policy.window_days} dias.` : "";
}

export function accessStatusLabel(access: Pick<StudentAppAccessState, "status" | "windowDays" | "enabled">): string {
  if (!access.enabled) return "Bloqueio por mensalidade desativado";
  if (access.status === "active") return `Ciclo ativo (${access.windowDays} dias)`;
  if (access.status === "locked") return `Acesso bloqueado (> ${access.windowDays} dias)`;
  return ACCESS_STATUS_LABELS[access.status];
}

export const ACCESS_STATUS_LABELS: Record<StudentAppAccessStatus, string> = {
  not_applicable: "Em cadastro",
  active: "Ciclo ativo (30 dias)",
  expiring_soon: "Ciclo vence em breve",
  proof_under_review: "Comprovante em conferência",
  override: "Liberação temporária",
  locked: "Acesso bloqueado (> 30 dias)",
};
