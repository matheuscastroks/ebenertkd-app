import type { AttendanceRecord, ClassEnrollment, Lesson } from "@/features/classes/types";

export type AttendanceCalendarStatus = AttendanceRecord["status"] | "scheduled" | "not_recorded" | "cancelled";

export function currentAttendanceMonth() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function normalizeAttendanceMonth(value: string | undefined, fallback: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "")) return fallback;
  return value as string;
}

export function membershipCoversLesson(membership: ClassEnrollment, lesson: Lesson) {
  const lessonDay = lesson.lesson_date.slice(0, 10);
  const localDay = (timestamp: string) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
    const part = (type: string) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  return localDay(membership.started_at) <= lessonDay && (!membership.ended_at || localDay(membership.ended_at) >= lessonDay);
}

export function attendanceCalendarStatus(lesson: Lesson, recordStatus?: AttendanceRecord["status"]): AttendanceCalendarStatus {
  if (lesson.status === "cancelled") return "cancelled";
  if (recordStatus) return recordStatus;
  return lesson.status === "open" ? "scheduled" : "not_recorded";
}
