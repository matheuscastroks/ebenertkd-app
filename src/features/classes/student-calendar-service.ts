import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getTrainingClass } from "@/features/classes/service";
import { buildUpcomingTrainingSessions } from "@/features/classes/student-calendar-rules";
import { agendaMonthBounds, type AgendaEvent } from "./monthly-agenda-rules";
import type { Lesson } from "@/features/classes/types";
import { eventDayKey, saoPauloInstant } from "@/features/events/dates";
import type { Event } from "@/features/events/types";
import { resolveStudentProfile } from "@/features/students/access";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { saoPauloToday } from "@/lib/dates";

export async function getStudentCalendarData(actor: Profile, month: string, requestedProfileId?: string | null) {
  const profile = await resolveStudentProfile(actor, requestedProfileId);
  const { tables, config } = createAppwriteAdminClient();
  const today = saoPauloToday();
  const { firstDay, nextMonth, days } = agendaMonthBounds(month);
  const [studentRes, events] = await Promise.all([
    tables.listRows<Student>({
      databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students,
      queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)]
    }),
    listAllRows<Event>(APPWRITE_IDS.tables.events, [
      Query.notEqual("status", "draft"),
      Query.greaterThanEqual("starts_at", saoPauloInstant(firstDay)),
      Query.lessThan("starts_at", saoPauloInstant(nextMonth)),
      Query.orderAsc("starts_at")
    ])
  ]);
  const student = studentRes.rows[0] ?? null;
  const trainingClass = student?.training_class_id
    ? await getTrainingClass(student.training_class_id).catch(() => null)
    : null;
  const lessons = trainingClass ? await listAllRows<Lesson>(APPWRITE_IDS.tables.lessons, [
    Query.equal("training_class_id", [trainingClass.$id]),
    Query.greaterThanEqual("lesson_date", `${firstDay}T00:00:00.000Z`),
    Query.lessThan("lesson_date", `${nextMonth}T00:00:00.000Z`),
    Query.orderAsc("lesson_date")
  ]) : [];
  const actualIds = new Set(lessons.map((lesson) => lesson.$id));
  const sessions = buildUpcomingTrainingSessions({ trainingClass, lessons, referenceDate: firstDay, horizonDays: days - 1 })
    .filter((session) => actualIds.has(session.id) || session.date >= today);
  const monthEvents: AgendaEvent[] = events.map((event) => ({
    id: event.$id, name: event.title, date: eventDayKey(event.starts_at), startsAt: event.starts_at,
    description: event.description ?? null, location: event.location_text ?? null,
    type: event.event_type, status: event.status
  }));
  return { profile, student, trainingClass, lessons, sessions, monthEvents };
}
