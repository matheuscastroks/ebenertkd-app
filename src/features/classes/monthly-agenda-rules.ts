import { attendanceCalendarStatus, type AttendanceCalendarStatus } from "./attendance-calendar-rules";
import type { UpcomingTrainingSession } from "./student-calendar-rules";
import type { AttendanceCalendarEntry } from "./types";
import { DAY_INDEX_TO_WEEKDAY } from "./schedule";

export type AgendaTraining = UpcomingTrainingSession & {
  status: AttendanceCalendarStatus;
};

export type AgendaEvent = {
  id: string;
  name: string;
  date: string;
  startsAt: string;
  location: string | null;
  description: string | null;
  type: import("@/features/events/types").EventType;
  status: import("@/features/events/types").EventStatus;
};

export function agendaMonthBounds(month: string) {
  const firstDay = `${month}-01`;
  const next = new Date(`${firstDay}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const nextMonth = next.toISOString().slice(0, 10);
  return { firstDay, nextMonth, days: Math.round((Date.parse(nextMonth) - Date.parse(firstDay)) / 86400000) };
}

/** Aula registrada substitui a projeção da mesma turma e horário; chamada nunca é inventada. */
export function mergeAgendaTraining(sessions: UpcomingTrainingSession[], entries: AttendanceCalendarEntry[]): AgendaTraining[] {
  const key = (date: string, start: string, name: string) => `${date}:${start}:${name}`;
  const result = new Map<string, AgendaTraining>();
  for (const session of sessions) result.set(key(session.date, session.startTime, session.classId ?? session.className), { ...session, status: "scheduled" });
  for (const { lesson, record, trainingClass } of entries) {
    const date = lesson.lesson_date.slice(0, 10);
    const className = trainingClass?.name ?? "Treino";
    const weekday = DAY_INDEX_TO_WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
    result.set(key(date, lesson.start_time, lesson.training_class_id), {
      id: lesson.$id, date, weekday, classId: lesson.training_class_id,
      startTime: lesson.start_time, endTime: lesson.end_time,
      className, location: trainingClass?.location ?? null, kind: lesson.lesson_type,
      status: attendanceCalendarStatus(lesson, record?.status)
    });
  }
  return [...result.values()].sort((a, b) => `${a.date}:${a.startTime}`.localeCompare(`${b.date}:${b.startTime}`));
}

export function nextAgendaTraining(items: AgendaTraining[], now: string) {
  return items.find((item) => item.status === "scheduled" && Date.parse(`${item.date}T${item.endTime}:00-03:00`) >= Date.parse(now));
}
