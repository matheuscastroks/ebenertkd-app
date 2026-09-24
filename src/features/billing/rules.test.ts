import { describe, expect, it } from "vitest";
import { billingSummary, chargeRowId, effectiveChargeStatus, isCompetenceWithinContract, resolveDueDate, shouldGenerateCompetence } from "@/features/billing/rules";
import type { Charge, Payment } from "@/features/billing/types";

describe("billing calendar", () => {
  it("uses the last valid day for due days 29 to 31", () => {
    expect(resolveDueDate("2026-02", 30)).toBe("2026-02-28");
    expect(resolveDueDate("2028-02", 30)).toBe("2028-02-29");
    expect(resolveDueDate("2026-04", 31)).toBe("2026-04-30");
  });
  it("generates seven days before and only inside contract dates", () => {
    expect(shouldGenerateCompetence("2026-07", "2026-06-24")).toBe(true);
    expect(shouldGenerateCompetence("2026-07", "2026-06-23")).toBe(false);
    expect(isCompetenceWithinContract("2026-07", "2026-01-15", "2026-07-14")).toBe(true);
    expect(isCompetenceWithinContract("2026-08", "2026-01-15", "2026-07-14")).toBe(false);
  });
  it("builds stable, origin-sensitive idempotency IDs", () => {
    expect(chargeRowId("e1", "monthly_fee", "2026-07", "c1")).toBe(chargeRowId("e1", "monthly_fee", "2026-07", "c1"));
    expect(chargeRowId("e1", "monthly_fee", "2026-07", "c1")).not.toBe(chargeRowId("e1", "monthly_fee", "2026-07", "c2"));
  });
  it("does not overwrite review or paid states when checking overdue", () => {
    expect(effectiveChargeStatus("pending", "2026-06-10", "2026-06-11")).toBe("overdue");
    expect(effectiveChargeStatus("proof_under_review", "2026-06-10", "2026-06-11")).toBe("proof_under_review");
  });
});

describe("billing metrics", () => {
  it("separates payments from distinct paying students by effective date", () => {
    const charges = [{ $id: "c1", student_id: "s1", amount_cents: 10000, status: "paid" }, { $id: "c2", student_id: "s1", amount_cents: 5000, status: "paid" }, { $id: "c3", student_id: "s2", amount_cents: 8000, status: "overdue" }] as Charge[];
    const payments = [{ charge_id: "c1", amount_cents: 10000, paid_at: "2026-06-02", status: "confirmed" }, { charge_id: "c2", amount_cents: 5000, paid_at: "2026-06-03", status: "confirmed" }] as Payment[];
    expect(billingSummary(charges, payments, "2026-06-01", "2026-06-30")).toMatchObject({ receivedCents: 15000, overdueCents: 8000, paidCharges: 2, distinctPayingStudents: 1 });
  });
  it("does not include payments outside the filtered charge set", () => {
    const charges = [{ $id: "c1", student_id: "s1", amount_cents: 10000, status: "paid" }] as Charge[];
    const payments = [{ charge_id: "c1", amount_cents: 10000, paid_at: "2026-06-02", status: "confirmed" }, { charge_id: "c2", amount_cents: 5000, paid_at: "2026-06-03", status: "confirmed" }] as Payment[];
    expect(billingSummary(charges, payments, "2026-06-01", "2026-06-30").receivedCents).toBe(10000);
  });
});
