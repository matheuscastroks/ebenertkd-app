import { format, isValid, parseISO } from "date-fns";

export const ATTENDANCE_STATUSES = ["present", "absent", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type AttendanceInput = { classEnrollmentId: string; status: AttendanceStatus };

export function canonicalLessonDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid_lesson_date");
  const parsed = parseISO(value);
  if (!isValid(parsed) || format(parsed, "yyyy-MM-dd") !== value) throw new Error("invalid_lesson_date");
  return value;
}

export function assertCompleteAttendance(expectedIds: string[], records: AttendanceInput[]) {
  const expected = new Set(expectedIds);
  const received = new Set(records.map((record) => record.classEnrollmentId));
  if (received.size !== records.length) throw new Error("attendance_batch_duplicate");
  if (records.some((record) => !expected.has(record.classEnrollmentId))) throw new Error("attendance_batch_unknown_enrollment");
  if (expected.size !== received.size || [...expected].some((id) => !received.has(id))) throw new Error("attendance_batch_incomplete");
  return records;
}

export function requiresCorrectionReason(existing: Map<string, AttendanceStatus>, records: AttendanceInput[]) {
  return records.some((record) => {
    const previous = existing.get(record.classEnrollmentId);
    return previous !== undefined && previous !== record.status;
  });
}

export function attendanceRate(records: AttendanceStatus[]) {
  const present = records.filter((status) => status === "present").length;
  const total = records.length;
  return { present, total, percentage: total === 0 ? 0 : Math.round((present / total) * 100) };
}
