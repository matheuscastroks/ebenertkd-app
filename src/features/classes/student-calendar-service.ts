import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getTrainingClass } from "@/features/classes/service";
import { buildUpcomingTrainingSessions } from "@/features/classes/student-calendar-rules";
import type { Lesson } from "@/features/classes/types";
import { eventDayKey } from "@/features/events/dates";
import type { Event } from "@/features/events/types";
import { resolveStudentProfile } from "@/features/students/access";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { saoPauloToday } from "@/lib/dates";

export async function getStudentCalendarData(actor: Profile, requestedProfileId?: string | null) {
  const profile = await resolveStudentProfile(actor, requestedProfileId);
  const { tables, config } = createAppwriteAdminClient();
  const today = saoPauloToday();

  const [studentRes, examsRes] = await Promise.all([
    tables.listRows<Student>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.students,
      queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)],
    }),
    tables.listRows<Event>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.events,
      queries: [Query.equal("status", ["published", "registration_open", "registration_closed", "in_progress"]), Query.orderAsc("starts_at"), Query.limit(30)],
    }),
  ]);

  const student = studentRes.rows[0] ?? null;
  const trainingClass = student?.training_class_id
    ? await getTrainingClass(student.training_class_id).catch(() => null)
    : null;

  const lessons = trainingClass
    ? (
        await tables.listRows<Lesson>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.lessons,
          queries: [
            Query.equal("training_class_id", [trainingClass.$id]),
            Query.orderAsc("lesson_date"),
            Query.limit(200),
          ],
        })
      ).rows
    : [];

  const upcomingSessions = buildUpcomingTrainingSessions({
    trainingClass,
    lessons,
    referenceDate: today,
    horizonDays: 21,
  });

  const upcomingExams = examsRes.rows
    .filter((event) => eventDayKey(event.starts_at) >= today)
    .map((event) => ({
      id: event.$id,
      name: event.title,
      date: eventDayKey(event.starts_at),
      location: event.location_text ?? null,
      type: event.event_type,
      status: event.status,
    }));

  return {
    profile,
    student,
    trainingClass,
    upcomingSessions,
    upcomingExams,
  };
}
