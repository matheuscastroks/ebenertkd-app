import { buildMonthlyClosingReport } from "@/features/billing/closing-rules";
import type { Charge, Payment } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import type { Enrollment } from "@/features/students/types";

/** Números reais da academia usados para pré-preencher a calculadora. */
export type PlanningBaseline = {
  activeStudents: number;
  awaitingRenewalStudents: number;
  /** Média da mensalidade líquida dos contratos assinados vigentes (cai para as matrículas ativas). */
  averageFeeCents: number;
  /** Quantos alunos pagam cada valor (mais frequentes primeiro, no máximo 6 faixas). */
  feeDistribution: Array<{ feeCents: number; count: number }>;
  feeDistributionOtherCount: number;
  /** Média dos últimos 3 fechamentos: (previsto - realizado) / previsto, em %. Null sem histórico. */
  defaultRatePercent: number | null;
  /** Receita realizada média dos últimos 3 meses fechados. */
  realizedLast3MonthsCents: number;
  monthsConsidered: number;
};

function previousCompetences(currentCompetence: string, count: number) {
  const [year, month] = currentCompetence.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (index + 1), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function buildPlanningBaseline(input: {
  contracts: Contract[];
  enrollments: Enrollment[];
  charges: Charge[];
  payments: Payment[];
  today: string;
}): PlanningBaseline {
  const { today } = input;
  const netFee = (enrollment: Enrollment) => Math.max(0, (enrollment.monthly_fee_cents ?? 0) - (enrollment.discount_cents ?? 0));

  const activeEnrollments = input.enrollments.filter((enrollment) => enrollment.status === "active");
  const awaitingRenewalStudents = new Set(
    input.enrollments.filter((enrollment) => enrollment.status === "awaiting_renewal").map((enrollment) => enrollment.student_id)
  ).size;

  const latestByStudent = new Map<string, Contract>();
  for (const contract of input.contracts) {
    if (contract.status !== "signed" || contract.ends_at.slice(0, 10) < today || contract.monthly_fee_cents <= 0) continue;
    const existing = latestByStudent.get(contract.student_id);
    if (!existing || contract.ends_at > existing.ends_at) latestByStudent.set(contract.student_id, contract);
  }
  const contractFees = [...latestByStudent.values()].map((contract) => contract.monthly_fee_cents);
  const fees = contractFees.length > 0 ? contractFees : activeEnrollments.map(netFee).filter((fee) => fee > 0);
  const averageFeeCents = fees.length ? Math.round(fees.reduce((sum, fee) => sum + fee, 0) / fees.length) : 0;

  const counts = new Map<number, number>();
  for (const fee of fees) counts.set(fee, (counts.get(fee) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const top = ranked.slice(0, 6);
  const feeDistribution = top.map(([feeCents, count]) => ({ feeCents, count })).sort((a, b) => a.feeCents - b.feeCents);
  const feeDistributionOtherCount = ranked.slice(6).reduce((sum, [, count]) => sum + count, 0);

  const months = previousCompetences(today.slice(0, 7), 3)
    .map((competence) => buildMonthlyClosingReport({ competence, charges: input.charges, payments: input.payments, reversals: [], referenceDate: today }))
    .filter((report) => report.expectedCents > 0);
  const defaultRatePercent = months.length
    ? Number(((months.reduce((sum, report) => sum + (report.expectedCents - report.receivedCompetenceCents) / report.expectedCents, 0) / months.length) * 100).toFixed(1))
    : null;
  const realizedLast3MonthsCents = months.length
    ? Math.round(months.reduce((sum, report) => sum + report.receivedCompetenceCents, 0) / months.length)
    : 0;

  return {
    activeStudents: new Set(activeEnrollments.map((enrollment) => enrollment.student_id)).size,
    awaitingRenewalStudents,
    averageFeeCents,
    feeDistribution,
    feeDistributionOtherCount,
    defaultRatePercent,
    realizedLast3MonthsCents,
    monthsConsidered: months.length
  };
}
