import "server-only";

import { ID, Query } from "node-appwrite";
import type { Enrollment, Student } from "@/features/students/types";
import type { ClassEnrollment, TrainingClass } from "@/features/classes/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function ensureActiveClassEnrollment(enrollment: Enrollment, student: Student) {
  if (enrollment.status !== "active") throw new Error("active_enrollment_required");
  if (!student.training_class_id) throw new Error("training_class_required");
  const { tables, config } = createAppwriteAdminClient();
  const trainingClass = await tables.getRow<TrainingClass>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.trainingClasses, rowId: student.training_class_id });
  if (trainingClass.status !== "active") throw new Error("training_class_inactive");
  const current = await tables.listRows<ClassEnrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.classEnrollments,
    queries: [Query.equal("enrollment_id", [enrollment.$id]), Query.equal("status", ["active"]), Query.limit(100)]
  });
  const now = new Date().toISOString();
  await Promise.all(current.rows.filter((row) => row.training_class_id !== trainingClass.$id).map((row) => tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.classEnrollments,
    rowId: row.$id,
    data: { status: "ended", ended_at: now, updated_at: now }
  })));
  const existing = await tables.listRows<ClassEnrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.classEnrollments,
    queries: [Query.equal("training_class_id", [trainingClass.$id]), Query.equal("enrollment_id", [enrollment.$id]), Query.limit(1)]
  });
  if (existing.rows[0]) return tables.updateRow<ClassEnrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.classEnrollments,
    rowId: existing.rows[0].$id,
    data: { status: "active", ended_at: null, updated_at: now }
  });
  return tables.createRow<ClassEnrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.classEnrollments,
    rowId: ID.unique(),
    permissions: [],
    data: { training_class_id: trainingClass.$id, enrollment_id: enrollment.$id, student_id: student.$id, status: "active", started_at: now, created_at: now, updated_at: now }
  });
}

export async function endClassEnrollment(enrollmentId: string, endedAt = new Date().toISOString()) {
  const { tables, config } = createAppwriteAdminClient();
  const rows = await tables.listRows<ClassEnrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.classEnrollments, queries: [Query.equal("enrollment_id", [enrollmentId]), Query.equal("status", ["active"]), Query.limit(100)] });
  await Promise.all(rows.rows.map((row) => tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.classEnrollments, rowId: row.$id, data: { status: "ended", ended_at: endedAt, updated_at: endedAt } })));
}
