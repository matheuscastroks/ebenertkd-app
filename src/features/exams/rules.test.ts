import { describe, expect, it } from "vitest";
import { assertNextGraduation, examChargeCancellation, groupStudentExams, sortBeltHistoryNewestFirst, type StudentExamEntry } from "@/features/exams/rules";
import type { BeltHistory, ExamEvent, ExamParticipant } from "@/features/exams/types";

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
