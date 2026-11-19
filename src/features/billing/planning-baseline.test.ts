import { describe, expect, it } from "vitest";
import type { Charge, Payment } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
import type { Enrollment } from "@/features/students/types";
import { buildPlanningBaseline } from "./planning-baseline";

const contract = (student: string, fee: number, endsAt: string, status = "signed") =>
  ({ $id: `c-${student}`, student_id: student, status, monthly_fee_cents: fee, ends_at: endsAt }) as unknown as Contract;
const enrollment = (student: string, status: string, fee = 0, discount = 0) =>
  ({ $id: `e-${student}`, student_id: student, status, monthly_fee_cents: fee, discount_cents: discount }) as unknown as Enrollment;
const charge = (id: string, competence: string, amount: number, status: string) =>
  ({ $id: id, competence, amount_cents: amount, status, charge_type: "monthly_fee", due_date: `${competence}-10T12:00:00.000Z`, student_id: "s", enrollment_id: "e" }) as unknown as Charge;

describe("planning baseline", () => {
  it("conta alunos, média dos contratos vigentes e distribuição de valores", () => {
    const baseline = buildPlanningBaseline({
      contracts: [
        contract("a", 15_000, "2027-03-01T12:00:00.000Z"),
        contract("b", 15_000, "2027-03-01T12:00:00.000Z"),
        contract("c", 12_000, "2027-03-01T12:00:00.000Z"),
        contract("d", 20_000, "2026-01-01T12:00:00.000Z"),
        contract("e", 9_000, "2027-03-01T12:00:00.000Z", "pending_signature")
      ],
      enrollments: [enrollment("a", "active"), enrollment("b", "active"), enrollment("c", "active"), enrollment("f", "awaiting_renewal")],
      charges: [],
      payments: [],
      today: "2026-11-18"
    });
    expect(baseline.activeStudents).toBe(3);
    expect(baseline.awaitingRenewalStudents).toBe(1);
    expect(baseline.averageFeeCents).toBe(14_000);
    expect(baseline.feeDistribution).toEqual([{ feeCents: 12_000, count: 1 }, { feeCents: 15_000, count: 2 }]);
    expect(baseline.defaultRatePercent).toBeNull();
    expect(baseline.monthsConsidered).toBe(0);
  });

  it("sem contratos vigentes usa a mensalidade líquida das matrículas ativas", () => {
    const baseline = buildPlanningBaseline({
      contracts: [],
      enrollments: [enrollment("a", "active", 15_000, 1_000), enrollment("b", "active", 13_000)],
      charges: [],
      payments: [],
      today: "2026-11-18"
    });
    expect(baseline.averageFeeCents).toBe(13_500);
  });

  it("calcula inadimplência e receita realizada média dos últimos 3 meses", () => {
    const baseline = buildPlanningBaseline({
      contracts: [],
      enrollments: [],
      charges: [
        charge("1", "2026-10", 10_000, "paid"),
        charge("2", "2026-10", 10_000, "pending"),
        charge("3", "2026-09", 10_000, "paid"),
        charge("4", "2026-08", 20_000, "paid"),
        charge("5", "2026-11", 10_000, "pending")
      ],
      payments: [] as Payment[],
      today: "2026-11-18"
    });
    expect(baseline.monthsConsidered).toBe(3);
    // outubro 50%, setembro 0%, agosto 0% -> média 16,7%
    expect(baseline.defaultRatePercent).toBe(16.7);
    expect(baseline.realizedLast3MonthsCents).toBe(13_333);
  });
});
