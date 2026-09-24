import { describe, expect, it } from "vitest";
import {
  attendanceRate,
  assertCompleteAttendance,
  canonicalLessonDate,
  requiresCorrectionReason,
} from "@/features/classes/attendance-rules";

describe("attendance rules", () => {
  it("keeps lesson dates stable and rejects impossible days", () => {
    expect(canonicalLessonDate("2026-09-24")).toBe("2026-09-24");
    expect(() => canonicalLessonDate("2026-02-30")).toThrow("invalid_lesson_date");
  });

  it("requires exactly one attendance state for every active enrollment", () => {
    const records = [
      { classEnrollmentId: "ce-1", status: "present" as const },
      { classEnrollmentId: "ce-2", status: "excused" as const },
    ];
    expect(assertCompleteAttendance(["ce-1", "ce-2"], records)).toEqual(records);
    expect(() => assertCompleteAttendance(["ce-1", "ce-2"], records.slice(0, 1))).toThrow("attendance_batch_incomplete");
    expect(() => assertCompleteAttendance(["ce-1"], [records[0], records[0]])).toThrow("attendance_batch_duplicate");
  });

  it("requires a reason only when a saved status changes", () => {
    const existing = new Map([["ce-1", "present" as const]]);
    expect(requiresCorrectionReason(existing, [{ classEnrollmentId: "ce-1", status: "present" }])).toBe(false);
    expect(requiresCorrectionReason(existing, [{ classEnrollmentId: "ce-1", status: "absent" }])).toBe(true);
  });

  it("calculates frequency from the complete period", () => {
    expect(attendanceRate(["present", "present", "absent", "excused"])).toEqual({ present: 2, total: 4, percentage: 50 });
    expect(attendanceRate([])).toEqual({ present: 0, total: 0, percentage: 0 });
  });
});
