import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { lessonSchema } from "@/features/classes/schemas";
import { canonicalLessonDate } from "@/features/classes/attendance-rules";
import type { Lesson, TrainingClass } from "@/features/classes/types";
import { writeAuditEvent } from "@/features/auth/service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

const lessonDateTime = (date: string) => `${canonicalLessonDate(date)}T12:00:00.000Z`;
const lessonId = (classId: string, date: string, startTime: string) => createHash("sha256").update(`${classId}:${date}:${startTime}`).digest("hex").slice(0, 36);

export async function createLesson(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = lessonSchema.parse(raw);
  const date = canonicalLessonDate(input.lessonDate);
  const { tables, config } = createAppwriteAdminClient();
  const trainingClass = await tables.getRow<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, rowId: input.trainingClassId });
  if (trainingClass.status !== "active") throw new Error("training_class_inactive");
  const rowId = lessonId(trainingClass.$id, date, input.startTime);
  const now = new Date().toISOString();
  try {
    const lesson = await tables.createRow<Lesson>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.lessons,
      rowId,
      permissions: [],
      data: { training_class_id: trainingClass.$id, lesson_date: lessonDateTime(date), start_time: input.startTime, end_time: input.endTime, lesson_type: input.lessonType, status: "open", created_by_account_id: actor.account_id, created_at: now, updated_at: now }
    });
    await writeAuditEvent("lesson.created", actor.account_id, "lesson", lesson.$id, { lesson_type: input.lessonType, lesson_date: date });
    return lesson;
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
    return tables.getRow<Lesson>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, rowId });
  }
}

export async function listLessonsForDate(date: string) {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<Lesson>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, queries: [Query.equal("lesson_date", [lessonDateTime(date)]), Query.orderAsc("start_time"), Query.limit(100)] });
  return result.rows;
}

export async function listLessonsForClass(classId: string, date?: string) {
  const { tables, config } = createAppwriteAdminClient();
  const queries = [Query.equal("training_class_id", [classId]), Query.limit(500)];
  const result = await tables.listRows<Lesson>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, queries });
  const canonicalDate = date ? canonicalLessonDate(date) : undefined;
  return result.rows
    .filter((lesson) => !canonicalDate || lesson.lesson_date.slice(0, 10) === canonicalDate)
    .sort((a, b) => `${b.lesson_date}:${b.start_time}`.localeCompare(`${a.lesson_date}:${a.start_time}`));
}
