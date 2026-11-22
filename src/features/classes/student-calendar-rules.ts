import { DEFAULT_ACADEMY_IDENTITY } from "@/features/academy/defaults";
import { DAY_INDEX_TO_WEEKDAY } from "@/features/classes/schedule";
import { WEEKDAYS, type Lesson, type TrainingClass, type Weekday } from "@/features/classes/types";
import { saoPauloToday } from "@/lib/dates";

export type UpcomingTrainingSession = {
  id: string;
  date: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  className: string;
  classId?: string;
  location: string | null;
  kind: "regular" | "makeup";
};

export type CalendarEventInput = {
  uid: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  description?: string;
  recurrenceWeekdays?: Weekday[];
  /** Nome curto da academia no PRODID do arquivo .ics. */
  productName?: string;
};

const WEEKDAY_TO_ICS_BYDAY: Record<Weekday, string> = {
  Domingo: "SU",
  Segunda: "MO",
  Terça: "TU",
  Quarta: "WE",
  Quinta: "TH",
  Sexta: "FR",
  Sábado: "SA",
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
      classId: lesson.training_class_id,
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
        classId: input.trainingClass.$id,
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

function saoPauloTimeToUtcIso(isoDay: string, hhmm: string): string {
  return new Date(`${isoDay.slice(0, 10)}T${hhmm}:00-03:00`).toISOString().replace(".000Z", "Z");
}

export function buildWeeklyRRule(weekdays?: Weekday[]): string | null {
  if (!weekdays || weekdays.length === 0) return null;
  const unique = new Set(weekdays);
  const orderedCodes = WEEKDAYS.filter((day) => unique.has(day)).map(
    (day) => WEEKDAY_TO_ICS_BYDAY[day]
  );
  if (orderedCodes.length === 0) return null;
  return `FREQ=WEEKLY;BYDAY=${orderedCodes.join(",")}`;
}

export function findFirstOccurrenceDate(weekdays: Weekday[], referenceDate?: string): string {
  const referenceDay = (referenceDate ?? saoPauloToday()).slice(0, 10);
  if (weekdays.length === 0) return referenceDay;
  const active = new Set(weekdays);
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDaysUtc(referenceDay, offset);
    if (active.has(weekdayForIsoDay(candidate))) {
      return candidate;
    }
  }
  return referenceDay;
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const day = compactDate(event.date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
  });

  if (event.startTime && event.endTime) {
    params.set("dates", `${day}T${compactTime(event.startTime)}/${day}T${compactTime(event.endTime)}`);
    params.set("ctz", "America/Sao_Paulo");
  } else {
    const nextDay = compactDate(addDaysUtc(event.date, 1));
    params.set("dates", `${day}/${nextDay}`);
  }

  if (event.description) {
    params.set("details", event.description);
  }
  if (event.location) {
    params.set("location", event.location);
  }

  const rrule = buildWeeklyRRule(event.recurrenceWeekdays);
  if (rrule) {
    params.set("recur", `RRULE:${rrule}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(event: CalendarEventInput): string {
  const isoDay = event.date.slice(0, 10);
  const params = new URLSearchParams({
    rru: "addevent",
    subject: event.title,
  });

  if (event.startTime && event.endTime) {
    params.set("startdt", saoPauloTimeToUtcIso(isoDay, event.startTime));
    params.set("enddt", saoPauloTimeToUtcIso(isoDay, event.endTime));
  } else {
    params.set("allday", "true");
    params.set("startdt", isoDay);
    params.set("enddt", addDaysUtc(isoDay, 1));
  }

  const descriptionParts: string[] = [];
  if (event.description) {
    descriptionParts.push(event.description);
  }
  if (event.recurrenceWeekdays && event.recurrenceWeekdays.length > 0) {
    descriptionParts.push(`Recorrência semanal: ${event.recurrenceWeekdays.join(", ")}.`);
  }
  if (descriptionParts.length > 0) {
    params.set("body", descriptionParts.join("\n"));
  }
  if (event.location) {
    params.set("location", event.location);
  }

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

export function buildIcsContent(event: CalendarEventInput): string {
  const day = compactDate(event.date);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcsText(event.productName ?? DEFAULT_ACADEMY_IDENTITY.short_name)}//Portal do Aluno//PT-BR`,
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

  const rrule = buildWeeklyRRule(event.recurrenceWeekdays);
  if (rrule) {
    lines.push(`RRULE:${rrule}`);
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
