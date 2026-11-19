import type { Charge, Payment } from "@/features/billing/types";
import type { CancellationRequest } from "@/features/contracts/types";
import type { BeltHistory } from "@/features/exams/types";
import type { PublicRank } from "@/features/academy/belt-rules";
import { rankOrder, type RankKey } from "@/features/academy/ranks";
import type { Enrollment, Student } from "@/features/students/types";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

export type AnnualMonthlyPoint = {
  month: number;
  competence: string;
  label: string;
  expectedCents: number;
  receivedCents: number;
  newEnrollments: number;
  cancelledEnrollments: number;
  graduations: number;
};

export type AnnualQuarterRow = {
  quarter: string;
  expectedCents: number;
  receivedCents: number;
  newEnrollments: number;
  cancelledEnrollments: number;
  graduations: number;
};

export type BeltFunnelPoint = {
  rankKey: RankKey;
  belt: string;
  shortBelt: string;
  activeCount: number;
  inactiveCount: number;
  graduationsInYear: number;
};

export type AnnualExecutiveReport = {
  year: number;
  annualExpectedCents: number;
  annualReceivedCents: number;
  collectionRatePct: number;
  newEnrollmentsTotal: number;
  cancellationsTotal: number;
  netGrowth: number;
  activeStudentsCount: number;
  averageTicketCents: number;
  averageTenureMonths: number;
  totalGraduationsInYear: number;
  monthlySeries: AnnualMonthlyPoint[];
  quarters: AnnualQuarterRow[];
  beltDistribution: BeltFunnelPoint[];
};

const ACTIVATED_STATUSES = new Set<Enrollment["status"]>([
  "active",
  "awaiting_renewal",
  "paused",
  "cancelled",
]);

export function buildAnnualExecutiveReport(input: {
  year: number;
  students: Student[];
  enrollments: Enrollment[];
  cancellations: CancellationRequest[];
  charges: Charge[];
  payments: Payment[];
  beltHistory: BeltHistory[];
  /** Graduações configuradas: o funil usa as habilitadas (e as que ainda têm alunos). */
  ranks: readonly PublicRank[];
  referenceDate?: string;
}): AnnualExecutiveReport {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const yearPrefix = `${input.year}-`;

  const enrollmentByStudent = new Map(input.enrollments.map((item) => [item.student_id, item]));
  const approvedCancellations = input.cancellations.filter((item) => item.status === "approved");
  const cancelDateByStudent = new Map<string, string>();
  for (const cancel of approvedCancellations) {
    const dt = (cancel.decided_at ?? cancel.target_exit_month).slice(0, 10);
    const prev = cancelDateByStudent.get(cancel.student_id);
    if (!prev || dt > prev) cancelDateByStudent.set(cancel.student_id, dt);
  }

  const validCharges = input.charges.filter((c) => c.status !== "cancelled");
  const confirmedPayments = input.payments.filter((p) => p.status === "confirmed");

  const monthlySeries: AnnualMonthlyPoint[] = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const competence = `${input.year}-${String(month).padStart(2, "0")}`;

    const expectedCents = validCharges
      .filter((c) => c.competence === competence)
      .reduce((sum, c) => sum + c.amount_cents, 0);

    const receivedCents = confirmedPayments
      .filter((p) => p.paid_at.startsWith(competence))
      .reduce((sum, p) => sum + p.amount_cents, 0);

    const newEnrollments = input.enrollments.filter(
      (e) =>
        ACTIVATED_STATUSES.has(e.status) &&
        (e.contract_start ?? e.created_at).startsWith(competence)
    ).length;

    const cancelledEnrollments = approvedCancellations.filter((c) =>
      (c.decided_at ?? c.target_exit_month).startsWith(competence)
    ).length;

    const graduations = input.beltHistory.filter((b) => b.achieved_at.startsWith(competence)).length;

    return {
      month,
      competence,
      label: MONTHS_SHORT[index],
      expectedCents,
      receivedCents,
      newEnrollments,
      cancelledEnrollments,
      graduations,
    };
  });

  const quarters: AnnualQuarterRow[] = [0, 1, 2, 3].map((q) => {
    const slice = monthlySeries.slice(q * 3, q * 3 + 3);
    return {
      quarter: `${q + 1}º Trimestre`,
      expectedCents: slice.reduce((sum, m) => sum + m.expectedCents, 0),
      receivedCents: slice.reduce((sum, m) => sum + m.receivedCents, 0),
      newEnrollments: slice.reduce((sum, m) => sum + m.newEnrollments, 0),
      cancelledEnrollments: slice.reduce((sum, m) => sum + m.cancelledEnrollments, 0),
      graduations: slice.reduce((sum, m) => sum + m.graduations, 0),
    };
  });

  const annualExpectedCents = monthlySeries.reduce((sum, m) => sum + m.expectedCents, 0);
  const annualReceivedCents = monthlySeries.reduce((sum, m) => sum + m.receivedCents, 0);
  const collectionRatePct =
    annualExpectedCents > 0
      ? Math.min(100, Math.round((annualReceivedCents / annualExpectedCents) * 100))
      : 0;
  const newEnrollmentsTotal = monthlySeries.reduce((sum, m) => sum + m.newEnrollments, 0);
  const cancellationsTotal = monthlySeries.reduce((sum, m) => sum + m.cancelledEnrollments, 0);
  const totalGraduationsInYear = monthlySeries.reduce((sum, m) => sum + m.graduations, 0);

  const activeEnrollments = input.enrollments.filter(
    (e) => e.status === "active" || e.status === "awaiting_renewal"
  );
  const feeSamples = activeEnrollments
    .filter((e) => (e.monthly_fee_cents ?? 0) > 0)
    .map((e) => Math.max(0, (e.monthly_fee_cents ?? 0) - (e.discount_cents ?? 0)));
  const averageTicketCents =
    feeSamples.length > 0
      ? Math.round(feeSamples.reduce((sum, v) => sum + v, 0) / feeSamples.length)
      : 0;

  const tenureMonthsSamples = input.enrollments
    .filter((e) => ACTIVATED_STATUSES.has(e.status))
    .map((e) => {
      const start = (e.contract_start ?? e.created_at).slice(0, 10);
      const end =
        e.status === "cancelled"
          ? cancelDateByStudent.get(e.student_id) ?? e.updated_at.slice(0, 10)
          : referenceDay;
      const days = Math.max(0, daysBetweenIsoDates(start, end));
      return days / 30;
    });
  const averageTenureMonths =
    tenureMonthsSamples.length > 0
      ? Number(
          (
            tenureMonthsSamples.reduce((sum, v) => sum + v, 0) / tenureMonthsSamples.length
          ).toFixed(1)
        )
      : 0;

  const graduationsInYear = input.beltHistory.filter((b) => b.achieved_at.startsWith(yearPrefix));
  const studentRanks = new Set(input.students.map((student) => student.rank_key));
  const beltMeta = [...input.ranks]
    .filter((rank) => rank.enabled || studentRanks.has(rank.rank_key))
    .sort((a, b) => rankOrder(a.rank_key) - rankOrder(b.rank_key))
    .map((rank) => ({ rankKey: rank.rank_key, belt: rank.display_name }));

  const beltDistribution: BeltFunnelPoint[] = beltMeta.map(({ rankKey, belt }) => {
    const inBelt = input.students.filter((student) => student.rank_key === rankKey);

    let activeCount = 0;
    let inactiveCount = 0;
    for (const student of inBelt) {
      const enrollment = enrollmentByStudent.get(student.$id);
      if (
        enrollment?.status === "active" ||
        enrollment?.status === "awaiting_renewal" ||
        student.status === "active"
      ) {
        activeCount += 1;
      } else if (enrollment?.status === "cancelled" || student.status === "inactive") {
        inactiveCount += 1;
      }
    }

    const grads = graduationsInYear.filter((row) => row.new_rank_key === rankKey).length;

    return {
      rankKey,
      belt,
      shortBelt: belt.replace("Ponta ", "P. "),
      activeCount,
      inactiveCount,
      graduationsInYear: grads,
    };
  });

  return {
    year: input.year,
    annualExpectedCents,
    annualReceivedCents,
    collectionRatePct,
    newEnrollmentsTotal,
    cancellationsTotal,
    netGrowth: newEnrollmentsTotal - cancellationsTotal,
    activeStudentsCount: activeEnrollments.length,
    averageTicketCents,
    averageTenureMonths,
    totalGraduationsInYear,
    monthlySeries,
    quarters,
    beltDistribution,
  };
}

export function availableAnalyticsYears(
  charges: Charge[],
  enrollments: Enrollment[],
  currentYear: number
): number[] {
  const years = new Set<number>([currentYear]);
  for (const charge of charges) {
    const y = Number(charge.competence.slice(0, 4));
    if (Number.isInteger(y) && y >= 2020 && y <= 2100) years.add(y);
  }
  for (const enrollment of enrollments) {
    const y = Number((enrollment.contract_start ?? enrollment.created_at).slice(0, 4));
    if (Number.isInteger(y) && y >= 2020 && y <= 2100) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}
