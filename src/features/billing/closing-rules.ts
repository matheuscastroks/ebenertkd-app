import { effectiveChargeStatus } from "@/features/billing/rules";
import type { Charge, ChargeType, Payment, PaymentReversal } from "@/features/billing/types";
import { saoPauloToday } from "@/lib/dates";

export type ClosingCategoryLine = {
  type: ChargeType;
  label: string;
  expectedCents: number;
  paidCents: number;
  openCents: number;
  overdueCents: number;
  chargeCount: number;
};

export type MonthlyClosingReport = {
  competence: string;
  expectedCents: number;
  receivedCompetenceCents: number;
  pendingCents: number;
  underReviewCents: number;
  underReviewCount: number;
  overdueCents: number;
  overdueCount: number;
  defaultRatePct: number;
  cashInMonthCents: number;
  recoveredPriorCents: number;
  reversalsCents: number;
  reversalsCount: number;
  netCashInMonthCents: number;
  categories: ClosingCategoryLine[];
  readyToClose: boolean;
};

const CATEGORY_ORDER: Array<{ type: ChargeType; label: string }> = [
  { type: "monthly_fee", label: "Mensalidades" },
  { type: "enrollment_fee", label: "Taxas de matrícula" },
  { type: "exam_fee", label: "Exames de faixa" },
  { type: "event_fee", label: "Eventos" },
  { type: "exit_fee", label: "Taxas de rescisão" },
];

export function buildMonthlyClosingReport(input: {
  competence: string;
  charges: Charge[];
  payments: Payment[];
  reversals: PaymentReversal[];
  referenceDate?: string;
}): MonthlyClosingReport {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const chargeById = new Map(input.charges.map((charge) => [charge.$id, charge]));
  const paymentById = new Map(input.payments.map((payment) => [payment.$id, payment]));

  const competenceCharges = input.charges
    .filter((charge) => charge.competence === input.competence && charge.status !== "cancelled")
    .map((charge) => ({
      ...charge,
      status: effectiveChargeStatus(charge.status, charge.due_date, referenceDay),
    }));

  const categories: ClosingCategoryLine[] = CATEGORY_ORDER.map(({ type, label }) => {
    const group = competenceCharges.filter((charge) => charge.charge_type === type);
    const expectedCents = group.reduce((sum, c) => sum + c.amount_cents, 0);
    const paidCents = group
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount_cents, 0);
    const overdueCents = group
      .filter((c) => c.status === "overdue")
      .reduce((sum, c) => sum + c.amount_cents, 0);
    const openCents = group
      .filter((c) => c.status !== "paid")
      .reduce((sum, c) => sum + c.amount_cents, 0);
    return {
      type,
      label,
      expectedCents,
      paidCents,
      openCents,
      overdueCents,
      chargeCount: group.length,
    };
  });

  const expectedCents = competenceCharges.reduce((sum, c) => sum + c.amount_cents, 0);
  const receivedCompetenceCents = competenceCharges
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount_cents, 0);
  const pendingCharges = competenceCharges.filter((c) => c.status === "pending");
  const underReviewCharges = competenceCharges.filter((c) => c.status === "proof_under_review");
  const overdueCharges = competenceCharges.filter((c) => c.status === "overdue");

  const pendingCents = pendingCharges.reduce((sum, c) => sum + c.amount_cents, 0);
  const underReviewCents = underReviewCharges.reduce((sum, c) => sum + c.amount_cents, 0);
  const overdueCents = overdueCharges.reduce((sum, c) => sum + c.amount_cents, 0);

  const defaultRatePct =
    expectedCents > 0 ? Number(((overdueCents / expectedCents) * 100).toFixed(1)) : 0;

  const confirmedPaymentsInMonth = input.payments.filter(
    (payment) =>
      payment.status === "confirmed" && payment.paid_at.slice(0, 7) === input.competence
  );
  const cashInMonthCents = confirmedPaymentsInMonth.reduce((sum, p) => sum + p.amount_cents, 0);
  const recoveredPriorCents = confirmedPaymentsInMonth
    .filter((payment) => {
      const charge = chargeById.get(payment.charge_id);
      return Boolean(charge && charge.competence < input.competence);
    })
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const reversalsInMonth = input.reversals.filter(
    (rev) => rev.reversed_at.slice(0, 7) === input.competence
  );
  const reversalsCents = reversalsInMonth.reduce((sum, rev) => {
    const payment = paymentById.get(rev.payment_id);
    return sum + (payment?.amount_cents ?? 0);
  }, 0);

  const netCashInMonthCents = Math.max(0, cashInMonthCents - reversalsCents);
  const readyToClose = underReviewCharges.length === 0;

  return {
    competence: input.competence,
    expectedCents,
    receivedCompetenceCents,
    pendingCents,
    underReviewCents,
    underReviewCount: underReviewCharges.length,
    overdueCents,
    overdueCount: overdueCharges.length,
    defaultRatePct,
    cashInMonthCents,
    recoveredPriorCents,
    reversalsCents,
    reversalsCount: reversalsInMonth.length,
    netCashInMonthCents,
    categories,
    readyToClose,
  };
}

export function availableClosingCompetences(
  charges: Charge[],
  currentCompetence: string
): string[] {
  const set = new Set<string>([currentCompetence]);
  for (const charge of charges) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(charge.competence)) {
      set.add(charge.competence);
    }
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}
