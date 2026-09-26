import { describe, expect, it } from "vitest";
import { assertNextGraduation, examChargeCancellation, sortBeltHistoryNewestFirst } from "@/features/exams/rules";
import type { BeltHistory } from "@/features/exams/types";

describe("exam rules", () => {
  it("accepts only the next coherent GUB and belt", () => {
    expect(() => assertNextGraduation(6, 5, "Ponta Azul")).not.toThrow();
    expect(() => assertNextGraduation(6, 4, "Azul")).toThrow("exam_graduation_must_be_next");
    expect(() => assertNextGraduation(6, 5, "Azul")).toThrow("exam_graduation_mismatch");
  });

  it("cancels unpaid charges and preserves paid charges with an explicit decision", () => {
    expect(examChargeCancellation("pending")).toBe("cancel");
    expect(examChargeCancellation("overdue")).toBe("cancel");
    expect(() => examChargeCancellation("paid")).toThrow("exam_paid_charge_decision_required");
    expect(examChargeCancellation("paid", "future_credit")).toBe("preserve");
    expect(examChargeCancellation("proof_under_review", "keep_charge")).toBe("preserve");
  });

  it("orders graduation history from newest to oldest without mutating input", () => {
    const oldest = { $id: "old", achieved_at: "2025-06-10T12:00:00.000Z" } as BeltHistory;
    const newest = { $id: "new", achieved_at: "2026-09-20T12:00:00.000Z" } as BeltHistory;
    const input = [oldest, newest];
    expect(sortBeltHistoryNewestFirst(input).map((item) => item.$id)).toEqual(["new", "old"]);
    expect(input.map((item) => item.$id)).toEqual(["old", "new"]);
  });
});
