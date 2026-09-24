import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { attendanceRate } from "@/features/classes/attendance-rules";
import type { AttendanceRecord, Lesson, TrainingClass } from "@/features/classes/types";
import { resolveStudentProfile } from "@/features/students/access";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function getAttendanceHistory(actor: Profile, requestedProfileId?: string | null) {
  const profile = await resolveStudentProfile(actor, requestedProfileId);
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)]
  });
  const student = students.rows[0];
  if (!student) return { profile, student: null, entries: [], summary: { attended: 0, total: 0, rate: 0 } };

  const records = await tables.listRows<AttendanceRecord>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.attendanceRecords,
    queries: [Query.equal("student_id", [student.$id]), Query.limit(500)]
  });
  if (records.rows.length === 0) return { profile, student, entries: [], summary: { attended: 0, total: 0, rate: 0 } };

  const lessons = await tables.listRows<Lesson>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.lessons,
    queries: [Query.equal("$id", [...new Set(records.rows.map((record) => record.lesson_id))]), Query.limit(500)]
  });
  const classes = await tables.listRows<TrainingClass>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.trainingClasses,
    queries: [Query.equal("$id", [...new Set(lessons.rows.map((lesson) => lesson.training_class_id))]), Query.limit(100)]
  });
  const lessonById = new Map(lessons.rows.map((lesson) => [lesson.$id, lesson]));
  const classById = new Map(classes.rows.map((trainingClass) => [trainingClass.$id, trainingClass]));
  const entries = records.rows.flatMap((record) => {
    const lesson = lessonById.get(record.lesson_id);
    if (!lesson) return [];
    return [{ record, lesson, trainingClass: classById.get(lesson.training_class_id) }];
  }).sort((a, b) => `${b.lesson.lesson_date}:${b.lesson.start_time}`.localeCompare(`${a.lesson.lesson_date}:${a.lesson.start_time}`));
  const attended = entries.filter(({ record }) => record.status === "present").length;
  return { profile, student, entries, summary: { attended, total: entries.length, rate: attendanceRate(entries.map(({ record }) => record.status)).percentage } };
}
