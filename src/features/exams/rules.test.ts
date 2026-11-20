import { describe, expect, it } from "vitest";
import { DEFAULT_PUBLIC_RANKS, type PublicRank } from "@/features/academy/belt-rules";
import { assertNextGraduation, assertPromotion, examChargeCancellation, examFeeCents, groupStudentExams, sortBeltHistoryNewestFirst, type StudentExamEntry } from "@/features/exams/rules";
import type { BeltHistory, ExamEvent, ExamParticipant } from "@/features/exams/types";

describe("exam rules", () => {
  const ranks: readonly PublicRank[] = DEFAULT_PUBLIC_RANKS;

  it("accepts any enabled higher graduation, including skipping, when the policy allows", () => {
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-5", true)).not.toThrow();
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-4", true)).not.toThrow();
    expect(() => assertNextGraduation(ranks, "gub-10", "gub-8", true)).not.toThrow();
    // Poom desativado por padrão: o 1º gub vai direto ao 1º Dan.
    expect(() => assertNextGraduation(ranks, "gub-1", "dan-1", true)).not.toThrow();
    expect(() => assertNextGraduation(ranks, "gub-1", "poom-1", true)).toThrow("exam_graduation_must_be_next");
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-6", true)).toThrow("exam_graduation_must_be_next");
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-7", true)).toThrow("exam_graduation_must_be_next");
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-99", true)).toThrow("exam_graduation_mismatch");
  });

  it("only accepts the next graduation when skipping is not allowed", () => {
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-5", false)).not.toThrow();
    expect(() => assertNextGraduation(ranks, "gub-6", "gub-4", false)).toThrow("exam_graduation_must_be_next");
  });

  it("includes Poom in the progression once the academy enables it", () => {
    const withPoom = ranks.map((rank) => (rank.rank_key.startsWith("poom-") ? { ...rank, enabled: true } : rank));
    expect(() => assertNextGraduation(withPoom, "gub-1", "poom-1", false)).not.toThrow();
    expect(() => assertNextGraduation(withPoom, "gub-1", "dan-1", false)).toThrow("exam_graduation_must_be_next");
    expect(() => assertNextGraduation(withPoom, "poom-4", "dan-1", false)).not.toThrow();
  });

  it("accepts a result for a promotion even if the target was disabled later, but never a demotion", () => {
    expect(() => assertPromotion("gub-6", "gub-5")).not.toThrow();
    expect(() => assertPromotion("gub-6", "gub-6")).toThrow("exam_graduation_must_be_next");
    expect(() => assertPromotion("gub-6", "gub-7")).toThrow("exam_graduation_must_be_next");
    expect(() => assertPromotion(null, "gub-5")).toThrow("exam_graduation_must_be_next");
  });

  it("prefers the graduation fee over the event fee", () => {
    expect(examFeeCents(12000, 15000)).toBe(12000);
    expect(examFeeCents(0, 15000)).toBe(0);
    expect(examFeeCents(null, 15000)).toBe(15000);
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

describe("groupStudentExams", () => {
  const entry = (id: string, date: string, participantStatus: ExamParticipant["status"], eventStatus: ExamEvent["status"] = "planned"): StudentExamEntry => ({
    participant: { $id: id, status: participantStatus } as ExamParticipant,
    event: { $id: `event-${id}`, event_date: date, status: eventStatus } as ExamEvent
  });

  it("lists open registrations as upcoming, soonest first", () => {
    const { upcoming } = groupStudentExams([
      entry("late", "2026-12-10T12:00:00.000Z", "registered", "confirmed"),
      entry("soon", "2026-11-30T12:00:00.000Z", "registered")
    ]);
    expect(upcoming.map((item) => item.participant.$id)).toEqual(["soon", "late"]);
  });

  it("moves graded exams and cancelled events to history, newest first", () => {
    const { upcoming, past } = groupStudentExams([
      entry("approved", "2025-06-10T12:00:00.000Z", "approved", "completed"),
      entry("event-cancelled", "2026-10-01T12:00:00.000Z", "registered", "cancelled"),
      entry("absent", "2026-03-01T12:00:00.000Z", "absent", "completed")
    ]);
    expect(upcoming).toEqual([]);
    expect(past.map((item) => item.participant.$id)).toEqual(["event-cancelled", "absent", "approved"]);
  });

  it("hides registrations the teacher removed", () => {
    const { upcoming, past } = groupStudentExams([entry("removed", "2026-12-01T12:00:00.000Z", "cancelled")]);
    expect(upcoming).toEqual([]);
    expect(past).toEqual([]);
  });
});
