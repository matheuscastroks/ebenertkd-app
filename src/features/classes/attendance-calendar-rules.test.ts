import { describe, expect, it } from "vitest";
import { attendanceCalendarStatus, membershipCoversLesson, normalizeAttendanceMonth } from "@/features/classes/attendance-calendar-rules";
import type { ClassEnrollment, Lesson } from "@/features/classes/types";

const lesson = { lesson_date: "2026-09-24T12:00:00.000Z", status: "completed" } as Lesson;
const membership = { started_at: "2026-08-01T10:00:00.000Z", ended_at: null } as ClassEnrollment;

describe("attendance calendar rules", () => {
  it("accepts a valid month and falls back for invalid input", () => {
    expect(normalizeAttendanceMonth("2026-09", "2026-01")).toBe("2026-09");
    expect(normalizeAttendanceMonth("2026-13", "2026-01")).toBe("2026-01");
  });

  it("shows only lessons inside the student's membership period", () => {
    expect(membershipCoversLesson(membership, lesson)).toBe(true);
    expect(membershipCoversLesson({ ...membership, ended_at: "2026-09-20T10:00:00.000Z" }, lesson)).toBe(false);
    expect(membershipCoversLesson({ ...membership, started_at: "2026-09-25T10:00:00.000Z" }, lesson)).toBe(false);
    expect(membershipCoversLesson({ ...membership, started_at: "2026-09-25T01:00:00.000Z" }, lesson)).toBe(true);
  });

  it("never calls a missing attendance record an absence", () => {
    expect(attendanceCalendarStatus(lesson, undefined)).toBe("not_recorded");
    expect(attendanceCalendarStatus({ ...lesson, status: "open" }, undefined)).toBe("scheduled");
    expect(attendanceCalendarStatus({ ...lesson, status: "cancelled" }, undefined)).toBe("cancelled");
    expect(attendanceCalendarStatus(lesson, "absent")).toBe("absent");
  });
});
