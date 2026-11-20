import { DEFAULT_CONTRACT_POLICY, type ExitFeeMode } from "@/features/academy/defaults";

export type ChargeStatus = "pendente" | "pago" | "atrasado";

type ChargeStatusInput = {
  dueDate: string;
  paidAt?: string;
  referenceDate: string;
};

type ExitFeeInput = {
  targetExitMonth: string;
  noticeDate: string;
  monthlyFeeInCents: number;
  /** Regra do contrato (snapshot da assinatura). Sem ela vale o padrão atual: dia 20 e uma mensalidade. */
  policy?: ExitFeePolicy;
};

export type ExitFeePolicy = {
  cancellation_notice_day: number;
  exit_fee_mode: ExitFeeMode;
  exit_fee_cents: number;
};

type RematriculaInput = {
  lastActiveDate: string;
  returnDate: string;
  months?: number;
};

function toUtcDate(input: string) {
  return new Date(`${input}T00:00:00Z`);
}

export function calculateChargeStatus({
  dueDate,
  paidAt,
  referenceDate
}: ChargeStatusInput): ChargeStatus {
  if (paidAt) {
    return "pago";
  }

  return toUtcDate(referenceDate) > toUtcDate(dueDate) ? "atrasado" : "pendente";
}

export function calculateExitFee({
  targetExitMonth,
  noticeDate,
  monthlyFeeInCents,
  policy = DEFAULT_CONTRACT_POLICY
}: ExitFeeInput) {
  const exitMonth = toUtcDate(targetExitMonth);
  const previousMonthDeadline = new Date(
    Date.UTC(exitMonth.getUTCFullYear(), exitMonth.getUTCMonth() - 1, policy.cancellation_notice_day)
  );

  if (toUtcDate(noticeDate) <= previousMonthDeadline) return 0;
  if (policy.exit_fee_mode === "none") return 0;
  return policy.exit_fee_mode === "fixed" ? policy.exit_fee_cents : monthlyFeeInCents;
}

export function requiresRematricula({
  lastActiveDate,
  returnDate,
  months = DEFAULT_CONTRACT_POLICY.rematriculation_after_months
}: RematriculaInput) {
  const lastActive = toUtcDate(lastActiveDate);
  const cutoff = new Date(
    Date.UTC(lastActive.getUTCFullYear(), lastActive.getUTCMonth() + months, lastActive.getUTCDate())
  );

  return toUtcDate(returnDate) > cutoff;
}
