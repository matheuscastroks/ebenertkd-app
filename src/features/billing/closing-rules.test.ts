import { describe, expect, it } from "vitest";
import {
  availableClosingCompetences,
  buildMonthlyClosingReport,
} from "@/features/billing/closing-rules";
import type { Charge, Payment, PaymentReversal } from "@/features/billing/types";

const makeCharge = (overrides: Partial<Charge>): Charge => ({
  $id: "c1",
  $sequence: "1",
  $createdAt: "2026-11-01T00:00:00Z",
  $updatedAt: "2026-11-01T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "charges",
  enrollment_id: "e1",
  student_id: "s1",
  charge_type: "monthly_fee",
  competence: "2026-11",
  origin_id: "o1",
  amount_cents: 15000,
  due_date: "2026-11-10T12:00:00Z",
  status: "pending",
  description: "Mensalidade 2026-11",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...overrides,
});

const makePayment = (overrides: Partial<Payment>): Payment => ({
  $id: "p1",
  $sequence: "1",
  $createdAt: "2026-11-10T00:00:00Z",
  $updatedAt: "2026-11-10T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "payments",
  charge_id: "c1",
  method: "pix_proof",
  amount_cents: 15000,
  paid_at: "2026-11-10T12:00:00Z",
  status: "confirmed",
  recorded_by_account_id: "admin1",
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
  ...overrides,
});

describe("closing-rules", () => {
  it("consolida previsto vs realizado por categoria e calcula recuperação de atrasados e estornos", () => {
    const charges: Charge[] = [
      makeCharge({ $id: "c1", charge_type: "monthly_fee", status: "paid", amount_cents: 20000 }),
      makeCharge({ $id: "c2", charge_type: "monthly_fee", status: "pending", due_date: "2026-11-05T12:00:00Z", amount_cents: 20000 }),
      makeCharge({ $id: "c3", charge_type: "exam_fee", status: "paid", amount_cents: 12000 }),
      makeCharge({ $id: "c4", competence: "2026-10", status: "paid", amount_cents: 18000 }),
      makeCharge({ $id: "c5", status: "cancelled", amount_cents: 10000 }),
    ];

    const payments: Payment[] = [
      makePayment({ $id: "p1", charge_id: "c1", amount_cents: 20000, paid_at: "2026-11-10T12:00:00Z" }),
      makePayment({ $id: "p2", charge_id: "c3", amount_cents: 12000, paid_at: "2026-11-12T12:00:00Z" }),
      makePayment({ $id: "p3", charge_id: "c4", amount_cents: 18000, paid_at: "2026-11-14T12:00:00Z" }),
      makePayment({ $id: "p4", charge_id: "c2", amount_cents: 5000, status: "reversed", paid_at: "2026-11-06T12:00:00Z" }),
    ];

    const reversals: PaymentReversal[] = [
      {
        $id: "r1",
        $sequence: "1",
        $createdAt: "2026-11-07T00:00:00Z",
        $updatedAt: "2026-11-07T00:00:00Z",
        $permissions: [],
        $databaseId: "db",
        $tableId: "reversals",
        payment_id: "p4",
        charge_id: "c2",
        reason: "Erro",
        reversed_by_account_id: "admin1",
        reversed_at: "2026-11-07T12:00:00Z",
        created_at: "2026-11-07T12:00:00Z",
      },
    ];

    const report = buildMonthlyClosingReport({
      competence: "2026-11",
      charges,
      payments,
      reversals,
      referenceDate: "2026-11-18",
    });

    expect(report.expectedCents).toBe(52000);
    expect(report.receivedCompetenceCents).toBe(32000);
    expect(report.overdueCents).toBe(20000);
    expect(report.recoveredPriorCents).toBe(18000);
    expect(report.cashInMonthCents).toBe(50000);
    expect(report.reversalsCents).toBe(5000);
    expect(report.netCashInMonthCents).toBe(45000);
    expect(report.readyToClose).toBe(true);
    expect(report.categories.find((c) => c.type === "exam_fee")).toMatchObject({
      expectedCents: 12000,
      paidCents: 12000,
    });
  });

  it("bloqueia prontidão de fechamento quando há comprovante em análise e lista competências", () => {
    const charges = [
      makeCharge({ $id: "c1", competence: "2026-10", status: "proof_under_review" }),
      makeCharge({ $id: "c2", competence: "2026-09", status: "paid" }),
    ];
    const report = buildMonthlyClosingReport({
      competence: "2026-10",
      charges,
      payments: [],
      reversals: [],
      referenceDate: "2026-11-18",
    });
    expect(report.readyToClose).toBe(false);
    expect(report.underReviewCount).toBe(1);
    expect(availableClosingCompetences(charges, "2026-11")).toEqual([
      "2026-11",
      "2026-10",
      "2026-09",
    ]);
  });
});
