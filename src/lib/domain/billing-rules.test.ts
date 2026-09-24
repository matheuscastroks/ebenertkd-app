import {
  calculateChargeStatus,
  calculateExitFee,
  requiresRematricula
} from "@/lib/domain/billing-rules";

describe("calculateChargeStatus", () => {
  it("returns paid when the charge has a payment date", () => {
    expect(
      calculateChargeStatus({
        dueDate: "2026-06-10",
        paidAt: "2026-06-09",
        referenceDate: "2026-06-11"
      })
    ).toBe("pago");
  });

  it("returns pending when unpaid but still before due date", () => {
    expect(
      calculateChargeStatus({
        dueDate: "2026-06-20",
        referenceDate: "2026-06-11"
      })
    ).toBe("pendente");
  });

  it("returns overdue when unpaid and after due date", () => {
    expect(
      calculateChargeStatus({
        dueDate: "2026-06-01",
        referenceDate: "2026-06-11"
      })
    ).toBe("atrasado");
  });
});

describe("calculateExitFee", () => {
  it("does not charge an exit fee when notice happens until the 20th of the previous month", () => {
    expect(
      calculateExitFee({
        targetExitMonth: "2026-07-01",
        noticeDate: "2026-06-20",
        monthlyFeeInCents: 18000
      })
    ).toBe(0);
  });

  it("charges one monthly fee when notice happens after the 20th of the previous month", () => {
    expect(
      calculateExitFee({
        targetExitMonth: "2026-07-01",
        noticeDate: "2026-06-21",
        monthlyFeeInCents: 18000
      })
    ).toBe(18000);
  });
});

describe("requiresRematricula", () => {
  it("does not require a new enrollment inside a six-month pause", () => {
    expect(
      requiresRematricula({
        lastActiveDate: "2026-01-15",
        returnDate: "2026-07-14"
      })
    ).toBe(false);
  });

  it("requires a new enrollment after more than six months away", () => {
    expect(
      requiresRematricula({
        lastActiveDate: "2026-01-15",
        returnDate: "2026-07-16"
      })
    ).toBe(true);
  });
});
