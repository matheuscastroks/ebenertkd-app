import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { attendanceRate } from "@/features/classes/attendance-rules";
import { membershipCoversLesson } from "@/features/classes/attendance-calendar-rules";
import type { AttendanceCalendarEntry, AttendanceRecord, ClassEnrollment, Lesson, TrainingClass } from "@/features/classes/types";
import { resolveStudentProfile } from "@/features/students/access";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function getAttendanceCalendar(actor: Profile, month: string, requestedProfileId?: string | null) {
  const profile = await resolveStudentProfile(actor, requestedProfileId);
  const { tables, config } = createAppwriteAdminClient();
  const studentRows = await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)] });
  const student = studentRows.rows[0] ?? null;
  const empty = { profile, student, month, entries: [] as AttendanceCalendarEntry[], summary: { attended: 0, total: 0, rate: 0 } };
  if (!student) return empty;

  const memberships = await tables.listRows<ClassEnrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.classEnrollments, queries: [Query.equal("student_id", [student.$id]), Query.limit(500)] });
  const classIds = [...new Set(memberships.rows.map((item) => item.training_class_id))];
  if (classIds.length === 0) return empty;

  const nextMonth = new Date(`${month}-01T12:00:00.000Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const start = `${month}-01T00:00:00.000Z`;
  const end = `${nextMonth.toISOString().slice(0, 7)}-01T00:00:00.000Z`;
  const lessons: Lesson[] = [];
  for (let startIndex = 0; startIndex < classIds.length; startIndex += 50) {
    const batch = classIds.slice(startIndex, startIndex + 50);
    let cursor: string | undefined;
    do {
      const page = await tables.listRows<Lesson>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, queries: [Query.equal("training_class_id", batch), Query.greaterThanEqual("lesson_date", start), Query.lessThan("lesson_date", end), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
      lessons.push(...page.rows);
      cursor = page.rows.length === 500 ? page.rows.at(-1)?.$id : undefined;
    } while (cursor);
  }
  const visibleLessons = lessons.filter((lesson) => memberships.rows.some((link) => link.training_class_id === lesson.training_class_id && membershipCoversLesson(link, lesson)));
  if (visibleLessons.length === 0) return empty;

  const [classes, records] = await Promise.all([
    tables.listRows<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, queries: [Query.equal("$id", [...new Set(visibleLessons.map((lesson) => lesson.training_class_id))]), Query.limit(100)] }),
    (async () => {
      const result: AttendanceRecord[] = [];
      for (let index = 0; index < visibleLessons.length; index += 50) {
        const ids = visibleLessons.slice(index, index + 50).map((lesson) => lesson.$id);
        let cursor: string | undefined;
        do {
          const page = await tables.listRows<AttendanceRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.attendanceRecords, queries: [Query.equal("student_id", [student.$id]), Query.equal("lesson_id", ids), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
          result.push(...page.rows);
          cursor = page.rows.length === 500 ? page.rows.at(-1)?.$id : undefined;
        } while (cursor);
      }
      return result;
    })()
  ]);
  const classById = new Map(classes.rows.map((item) => [item.$id, item]));
  const recordByLesson = new Map(records.map((record) => [record.lesson_id, record]));
  const entries: AttendanceCalendarEntry[] = visibleLessons.map((lesson) => ({ lesson, trainingClass: classById.get(lesson.training_class_id), record: recordByLesson.get(lesson.$id) })).sort((a, b) => `${a.lesson.lesson_date}:${a.lesson.start_time}`.localeCompare(`${b.lesson.lesson_date}:${b.lesson.start_time}`));
  const recorded = entries.filter((entry) => entry.lesson.status !== "cancelled" && entry.record).map((entry) => entry.record!.status);
  const rate = attendanceRate(recorded);
  return { profile, student, month, entries, summary: { attended: rate.present, total: rate.total, rate: rate.percentage } };
}
