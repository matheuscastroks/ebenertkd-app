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
};

type RematriculaInput = {
  lastActiveDate: string;
  returnDate: string;
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
  monthlyFeeInCents
}: ExitFeeInput) {
  const exitMonth = toUtcDate(targetExitMonth);
  const previousMonthDeadline = new Date(
    Date.UTC(exitMonth.getUTCFullYear(), exitMonth.getUTCMonth() - 1, 20)
  );

  return toUtcDate(noticeDate) > previousMonthDeadline ? monthlyFeeInCents : 0;
}

export function requiresRematricula({
  lastActiveDate,
  returnDate
}: RematriculaInput) {
  const lastActive = toUtcDate(lastActiveDate);
  const cutoff = new Date(
    Date.UTC(lastActive.getUTCFullYear(), lastActive.getUTCMonth() + 6, lastActive.getUTCDate())
  );

  return toUtcDate(returnDate) > cutoff;
}
