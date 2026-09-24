import { describe, expect, it } from "vitest";
import { buildBillingTrend } from "@/features/billing/chart-data";
import type { Charge, Payment } from "@/features/billing/types";

describe("buildBillingTrend", () => {
  it("fills six ordered competences and separates financial states", () => {
    const charges = [
      { $id: "c1", competence: "2026-08", amount_cents: 12000, status: "paid" },
      { $id: "c2", competence: "2026-09", amount_cents: 15000, status: "pending" },
      { $id: "c3", competence: "2026-09", amount_cents: 9000, status: "overdue" }
    ] as Charge[];
    const payments = [{ charge_id: "c1", paid_at: "2026-08-10", amount_cents: 12000, status: "confirmed" }] as Payment[];
    const result = buildBillingTrend(charges, payments, "2026-09-24");
    expect(result.map((item) => item.competence)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(result.at(-2)).toMatchObject({ received: 12000, pending: 0, overdue: 0 });
    expect(result.at(-1)).toMatchObject({ received: 0, pending: 15000, overdue: 9000 });
  });

  it("ignores reversed payments and payments outside the charge set", () => {
    const charges = [{ $id: "c1", competence: "2026-09", amount_cents: 10000, status: "paid" }] as Charge[];
    const payments = [{ charge_id: "c1", paid_at: "2026-09-10", amount_cents: 10000, status: "reversed" }, { charge_id: "c2", paid_at: "2026-09-11", amount_cents: 5000, status: "confirmed" }] as Payment[];
    expect(buildBillingTrend(charges, payments, "2026-09-24").at(-1)?.received).toBe(0);
  });
});
