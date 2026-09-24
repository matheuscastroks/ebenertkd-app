import { describe, expect, it } from "vitest";
import { paymentReminderCopy, paymentReminderStage } from "./payment-reminders";

describe("payment reminders", () => {
  const due = "2026-10-10T12:00:00.000Z";

  it.each([
    ["2026-10-07", "due_minus_3"],
    ["2026-10-10", "due_today"],
    ["2026-10-13", "overdue_plus_3"],
    ["2026-10-20", "overdue_weekly_1"],
    ["2026-10-27", "overdue_weekly_2"]
  ])("selects the expected stage on %s", (reference, expected) => {
    expect(paymentReminderStage(due, reference)).toBe(expected);
  });

  it("does not notify outside the configured schedule", () => {
    expect(paymentReminderStage(due, "2026-10-08")).toBeNull();
    expect(paymentReminderStage(due, "2026-10-14")).toBeNull();
  });

  it("keeps lock-screen-sensitive values out of generic reminder copy", () => {
    const copy = paymentReminderCopy("due_today", "Mensalidade 2026-10");
    expect(copy.body).not.toContain("R$");
    expect(copy.body).not.toMatch(/\d{3}[.,]\d{2}/);
  });
});
