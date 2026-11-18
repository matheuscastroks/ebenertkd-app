import { DAY_INDEX_TO_WEEKDAY } from "@/features/classes/schedule";
import type { Lesson, TrainingClass, Weekday } from "@/features/classes/types";
import { saoPauloToday } from "@/lib/dates";

export type UpcomingTrainingSession = {
  id: string;
  date: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  className: string;
  location: string | null;
  kind: "regular" | "makeup";
};

function addDaysUtc(isoDay: string, offset: number): string {
  const ms = Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`);
  return new Date(ms + offset * 86400000).toISOString().slice(0, 10);
}

function weekdayForIsoDay(isoDay: string): Weekday {
  const ms = Date.parse(`${isoDay.slice(0, 10)}T12:00:00Z`);
  const dayIndex = new Date(ms).getUTCDay();
  return DAY_INDEX_TO_WEEKDAY[dayIndex];
}

export function buildUpcomingTrainingSessions(input: {
  trainingClass: TrainingClass | null;
  lessons: Lesson[];
  referenceDate?: string;
  horizonDays?: number;
}): UpcomingTrainingSession[] {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const horizonDays = input.horizonDays ?? 21;
  const endDay = addDaysUtc(referenceDay, horizonDays);

  const sessions = new Map<string, UpcomingTrainingSession>();
  const cancelledKeys = new Set<string>();

  for (const lesson of input.lessons) {
    const day = lesson.lesson_date.slice(0, 10);
    if (day < referenceDay || day > endDay) continue;
    const key = `${day}:${lesson.start_time}`;
    if (lesson.status === "cancelled") {
      cancelledKeys.add(key);
      continue;
    }
    sessions.set(key, {
      id: lesson.$id,
      date: day,
      weekday: weekdayForIsoDay(day),
      startTime: lesson.start_time,
      endTime: lesson.end_time,
      className: input.trainingClass?.name ?? "Treino",
      location: input.trainingClass?.location ?? null,
      kind: lesson.lesson_type,
    });
  }

  if (input.trainingClass && input.trainingClass.status === "active") {
    const activeWeekdays = new Set(input.trainingClass.weekdays);
    for (let offset = 0; offset <= horizonDays; offset += 1) {
      const day = addDaysUtc(referenceDay, offset);
      const weekday = weekdayForIsoDay(day);
      if (!activeWeekdays.has(weekday)) continue;
      const key = `${day}:${input.trainingClass.start_time}`;
      if (cancelledKeys.has(key) || sessions.has(key)) continue;
      sessions.set(key, {
        id: `projected-${day}-${input.trainingClass.$id}`,
        date: day,
        weekday,
        startTime: input.trainingClass.start_time,
        endTime: input.trainingClass.end_time,
        className: input.trainingClass.name,
        location: input.trainingClass.location ?? null,
        kind: "regular",
      });
    }
  }

  return [...sessions.values()].sort((a, b) =>
    `${a.date}:${a.startTime}`.localeCompare(`${b.date}:${b.startTime}`)
  );
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function compactDate(isoDay: string): string {
  return isoDay.slice(0, 10).replaceAll("-", "");
}

function compactTime(hhmm: string): string {
  return `${hhmm.replace(":", "")}00`;
}

export function buildIcsContent(event: {
  uid: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  description?: string;
}): string {
  const day = compactDate(event.date);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ebener TKD//Portal do Aluno//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}@ebenertkd`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.startTime && event.endTime) {
    lines.push(`DTSTART;TZID=America/Sao_Paulo:${day}T${compactTime(event.startTime)}`);
    lines.push(`DTEND;TZID=America/Sao_Paulo:${day}T${compactTime(event.endTime)}`);
  } else {
    const nextDay = compactDate(addDaysUtc(event.date, 1));
    lines.push(`DTSTART;VALUE=DATE:${day}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
