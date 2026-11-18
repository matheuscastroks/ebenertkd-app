import { describe, expect, it } from "vitest";
import type { Charge, Payment } from "@/features/billing/types";
import type { CancellationRequest } from "@/features/contracts/types";
import type { BeltHistory } from "@/features/exams/types";
import {
  availableAnalyticsYears,
  buildAnnualExecutiveReport,
} from "@/features/operations/annual-analytics-rules";
import type { Enrollment, Student } from "@/features/students/types";

const rowBase = {
  $sequence: "1",
  $createdAt: "2026-01-01T00:00:00Z",
  $updatedAt: "2026-01-01T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "tbl",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("annual-analytics-rules", () => {
  it("consolida série de 12 meses, trimestres, LTV médio, ticket médio e funil de faixas", () => {
    const students: Student[] = [
      { ...rowBase, $id: "s1", profile_id: "p1", full_name: "Aluno 1", current_belt: "Amarela", gub: 8, status: "active" },
      { ...rowBase, $id: "s2", profile_id: "p2", full_name: "Aluno 2", current_belt: "Branca", gub: 10, status: "inactive" },
    ];
    const enrollments: Enrollment[] = [
      {
        ...rowBase,
        $id: "e1",
        student_id: "s1",
        status: "active",
        monthly_fee_cents: 20000,
        discount_cents: 2000,
        contract_start: "2026-02-01T12:00:00Z",
        revision: 1,
      },
      {
        ...rowBase,
        $id: "e2",
        student_id: "s2",
        status: "cancelled",
        monthly_fee_cents: 18000,
        contract_start: "2026-01-15T12:00:00Z",
        revision: 1,
      },
    ];
    const cancellations: CancellationRequest[] = [
      {
        ...rowBase,
        $id: "cr1",
        contract_id: "ct2",
        enrollment_id: "e2",
        student_id: "s2",
        requested_by_profile_id: "p2",
        target_exit_month: "2026-05-01T12:00:00Z",
        notice_date: "2026-04-10T12:00:00Z",
        suggested_fee_cents: 0,
        status: "approved",
        decided_at: "2026-04-15T12:00:00Z",
      },
    ];
    const charges: Charge[] = [
      {
        ...rowBase,
        $id: "ch1",
        enrollment_id: "e1",
        student_id: "s1",
        charge_type: "monthly_fee",
        competence: "2026-03",
        origin_id: "o1",
        amount_cents: 18000,
        due_date: "2026-03-10T12:00:00Z",
        status: "paid",
        description: "Mensalidade 03/2026",
      },
    ];
    const payments: Payment[] = [
      {
        ...rowBase,
        $id: "pay1",
        charge_id: "ch1",
        method: "pix_proof",
        amount_cents: 18000,
        paid_at: "2026-03-10T12:00:00Z",
        status: "confirmed",
        recorded_by_account_id: "admin",
      },
    ];
    const beltHistory: BeltHistory[] = [
      {
        ...rowBase,
        $id: "bh1",
        student_id: "s1",
        event_id: "ev1",
        exam_participant_id: "ep1",
        previous_belt: "Ponta Amarela",
        previous_gub: 9,
        new_belt: "Amarela",
        new_gub: 8,
        achieved_at: "2026-06-20T12:00:00Z",
      },
    ];

    const report = buildAnnualExecutiveReport({
      year: 2026,
      students,
      enrollments,
      cancellations,
      charges,
      payments,
      beltHistory,
      referenceDate: "2026-11-18",
    });

    expect(report.monthlySeries).toHaveLength(12);
    expect(report.quarters).toHaveLength(4);
    expect(report.annualExpectedCents).toBe(18000);
    expect(report.annualReceivedCents).toBe(18000);
    expect(report.collectionRatePct).toBe(100);
    expect(report.newEnrollmentsTotal).toBe(2);
    expect(report.cancellationsTotal).toBe(1);
    expect(report.netGrowth).toBe(1);
    expect(report.averageTicketCents).toBe(18000);
    expect(report.averageTenureMonths).toBeGreaterThan(5);
    expect(report.totalGraduationsInYear).toBe(1);
    expect(report.beltDistribution.find((b) => b.gub === 8)).toMatchObject({
      activeCount: 1,
      graduationsInYear: 1,
    });
    expect(report.beltDistribution.find((b) => b.gub === 10)).toMatchObject({
      inactiveCount: 1,
    });
    expect(availableAnalyticsYears(charges, enrollments, 2026)).toEqual([2026]);
  });
});
