import "server-only";

import { ID, Permission, Query, Role } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import type { Enrollment, EnrollmentBundle, Student, StudentDocument } from "@/features/students/types";

function ownerPermissions(target: Profile, actor: Profile) {
  const accountIds = new Set([target.account_id]);
  if (actor.account_id !== target.account_id && actor.capabilities.includes("guardian")) accountIds.add(actor.account_id);
  return [...accountIds].flatMap((accountId) => [
    Permission.read(Role.user(accountId)),
    Permission.update(Role.user(accountId))
  ]);
}

export async function getOrCreateEnrollmentBundle(target: Profile, actor: Profile): Promise<EnrollmentBundle> {
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const permissions = ownerPermissions(target, actor);
  const studentRows = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [target.$id]), Query.limit(1)]
  });
  const student = studentRows.rows[0] ?? await tables.createRow<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    rowId: ID.unique(),
    data: { profile_id: target.$id, full_name: target.full_name, status: "draft", created_at: now, updated_at: now },
    permissions
  });

  const enrollmentRows = await tables.listRows<Enrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    queries: [Query.equal("student_id", [student.$id]), Query.limit(1)]
  });
  const enrollment = enrollmentRows.rows[0] ?? await tables.createRow<Enrollment>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollments,
    rowId: ID.unique(),
    data: { student_id: student.$id, status: "draft", revision: 1, created_at: now, updated_at: now },
    permissions
  });
  const documents = await tables.listRows<StudentDocument>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.studentDocuments,
    queries: [Query.equal("student_id", [student.$id]), Query.limit(10)]
  });
  return { student, enrollment, documents: documents.rows };
}

export async function getEnrollmentBundleByStudentId(studentId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const student = await tables.getRow<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: studentId });
  const [enrollments, documents] = await Promise.all([
    tables.listRows<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [studentId]), Query.limit(1)] }),
    tables.listRows<StudentDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.studentDocuments, queries: [Query.equal("student_id", [studentId]), Query.limit(10)] })
  ]);
  const enrollment = enrollments.rows[0];
  if (!enrollment) throw new Error("enrollment_not_found");
  return { student, enrollment, documents: documents.rows } satisfies EnrollmentBundle;
}

export const ENROLLMENTS_PAGE_SIZE = 20;

export async function listEnrollmentsForReview(filters: { search?: string; status?: string; belt?: string; trainingClass?: string; page?: number } = {}) {
  const { tables, config } = createAppwriteAdminClient();
  const requestedPage = Math.max(1, Math.trunc(filters.page ?? 1));
  const queries = [Query.orderDesc("$createdAt")];
  if (filters.status) {
    const matchingEnrollments = await tables.listRows<Enrollment>({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.enrollments,
      queries: [Query.equal("status", [filters.status]), Query.limit(500)]
    });
    const studentIds = [...new Set(matchingEnrollments.rows.map((enrollment) => enrollment.student_id))];
    if (studentIds.length === 0) return { rows: [], page: 1, pageSize: ENROLLMENTS_PAGE_SIZE, total: 0, totalPages: 0 };
    queries.push(Query.equal("$id", studentIds));
  }
  if (filters.search?.trim()) queries.push(Query.contains("full_name", [filters.search.trim()]));
  if (filters.belt?.trim()) queries.push(Query.equal("current_belt", [filters.belt.trim()]));
  if (filters.trainingClass?.trim()) queries.push(Query.equal("training_class", [filters.trainingClass.trim()]));
  let students = await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [...queries, Query.limit(ENROLLMENTS_PAGE_SIZE), Query.offset((requestedPage - 1) * ENROLLMENTS_PAGE_SIZE)] });
  const totalPages = Math.ceil(students.total / ENROLLMENTS_PAGE_SIZE);
  const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
  if (page !== requestedPage) {
    students = await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [...queries, Query.limit(ENROLLMENTS_PAGE_SIZE), Query.offset((page - 1) * ENROLLMENTS_PAGE_SIZE)] });
  }
  const rows = await Promise.all(students.rows.map(async (student) => {
    const [enrollments, photos] = await Promise.all([
      tables.listRows<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [student.$id]), Query.limit(1)] }),
      tables.listRows<StudentDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.studentDocuments, queries: [Query.equal("student_id", [student.$id]), Query.equal("document_type", ["profile_photo"]), Query.limit(1)] })
    ]);
    const photo = photos.rows[0];
    return { student, enrollment: enrollments.rows[0] ?? null, profilePhotoDocumentId: photo?.status === "rejected" ? undefined : photo?.$id };
  }));
  return { rows, page, pageSize: ENROLLMENTS_PAGE_SIZE, total: students.total, totalPages };
}

export async function listProfilePhotoDocumentIds(profileIds: string[]) {
  const result = new Map<string, string>();
  if (profileIds.length === 0) return result;
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", profileIds), Query.limit(100)]
  });
  if (students.rows.length === 0) return result;
  const documents = await tables.listRows<StudentDocument>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.studentDocuments,
    queries: [Query.equal("student_id", students.rows.map((student) => student.$id)), Query.equal("document_type", ["profile_photo"]), Query.limit(100)]
  });
  const profileByStudent = new Map(students.rows.map((student) => [student.$id, student.profile_id]));
  for (const document of documents.rows) {
    if (document.status === "rejected") continue;
    const profileId = profileByStudent.get(document.student_id);
    if (profileId) result.set(profileId, document.$id);
  }
  return result;
}
