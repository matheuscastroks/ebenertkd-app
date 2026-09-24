import "server-only";

import { createHash } from "node:crypto";
import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { assertCompleteAttendance, requiresCorrectionReason, type AttendanceStatus } from "@/features/classes/attendance-rules";
import { attendanceBatchSchema } from "@/features/classes/schemas";
import type { AttendanceRecord, ClassEnrollment, Lesson } from "@/features/classes/types";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

const attendanceId = (lessonId: string, classEnrollmentId: string) => createHash("sha256").update(`${lessonId}:${classEnrollmentId}`).digest("hex").slice(0, 36);

export async function getAttendanceSheet(lessonId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const lesson = await tables.getRow<Lesson>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, rowId: lessonId });
  const [links, attendance] = await Promise.all([
    tables.listRows<ClassEnrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.classEnrollments, queries: [Query.equal("training_class_id", [lesson.training_class_id]), Query.limit(500)] }),
    tables.listRows<AttendanceRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.attendanceRecords, queries: [Query.equal("lesson_id", [lesson.$id]), Query.limit(500)] })
  ]);
  const lessonTime = new Date(lesson.lesson_date).getTime();
  const eligible = links.rows.filter((link) => new Date(link.started_at).getTime() <= lessonTime && (!link.ended_at || new Date(link.ended_at).getTime() >= lessonTime));
  const students = eligible.length === 0 ? [] : (await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("$id", eligible.map((link) => link.student_id)), Query.orderAsc("full_name"), Query.limit(500)] })).rows;
  const studentById = new Map(students.map((student) => [student.$id, student]));
  const attendanceByLink = new Map(attendance.rows.map((record) => [record.class_enrollment_id, record]));
  return {
    lesson,
    rows: eligible.map((link) => ({ classEnrollment: link, student: studentById.get(link.student_id), attendance: attendanceByLink.get(link.$id) })).filter((row) => row.student !== undefined)
  };
}

export async function saveAttendanceBatch(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = attendanceBatchSchema.parse(raw);
  const sheet = await getAttendanceSheet(input.lessonId);
  if (sheet.lesson.status === "cancelled") throw new Error("lesson_cancelled");
  if (sheet.rows.length === 0) throw new Error("attendance_roster_empty");
  assertCompleteAttendance(sheet.rows.map((row) => row.classEnrollment.$id), input.records);
  const existing = new Map(sheet.rows.filter((row) => row.attendance).map((row) => [row.classEnrollment.$id, row.attendance!.status as AttendanceStatus]));
  const correcting = requiresCorrectionReason(existing, input.records);
  if (correcting && !input.correctionReason) throw new Error("attendance_correction_reason_required");

  const { tables, config } = createAppwriteAdminClient();
  const transaction = await tables.createTransaction({ ttl: 60 });
  const now = new Date().toISOString();
  try {
    await Promise.all(input.records.map((record) => {
      const row = sheet.rows.find((item) => item.classEnrollment.$id === record.classEnrollmentId)!;
      const current = row.attendance;
      const data = { status: record.status, recorded_by_account_id: actor.account_id, correction_reason: current && current.status !== record.status ? input.correctionReason : current?.correction_reason, updated_at: now };
      return current
        ? tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.attendanceRecords, rowId: current.$id, data, transactionId: transaction.$id })
        : tables.createRow<AttendanceRecord>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.attendanceRecords, rowId: attendanceId(sheet.lesson.$id, row.classEnrollment.$id), permissions: [], transactionId: transaction.$id, data: { lesson_id: sheet.lesson.$id, class_enrollment_id: row.classEnrollment.$id, enrollment_id: row.classEnrollment.enrollment_id, student_id: row.classEnrollment.student_id, ...data, created_at: now } });
    }));
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.lessons, rowId: sheet.lesson.$id, data: { status: "completed", updated_at: now }, transactionId: transaction.$id });
    await tables.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) {
    await tables.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw error;
  }
  await writeAuditEvent(correcting ? "attendance.corrected" : "attendance.recorded", actor.account_id, "lesson", sheet.lesson.$id, { records: input.records.length, correction_reason: input.correctionReason });
  return getAttendanceSheet(sheet.lesson.$id);
}
