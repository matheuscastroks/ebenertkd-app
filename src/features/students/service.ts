import "server-only";

import { ID, Permission, Query, Role } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import type { Enrollment, EnrollmentBundle, Student, StudentDocument } from "@/features/students/types";

/** Sexo do próprio cadastro de aluno, para escolher a ilustração quando não há foto. */
export async function getOwnStudentAvatarSex(profile: Profile): Promise<Student["sex"]> {
  if (!profile.capabilities.includes("student")) return null;
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<Student>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.students,
    queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)]
  });
  return result.rows[0]?.sex ?? null;
}

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

export function countEnrollmentsRequiringReview() {
  return cachedRead(
    { name: "count-enrollments-requiring-review", key: [], tags: [CACHE_TAGS.enrollments], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<Enrollment>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.enrollments,
        queries: [Query.equal("status", ["submitted", "under_review"]), Query.limit(1)]
      });
      return result.total;
    }
  );
}

export function listEnrollmentsForReview(filters: { search?: string; status?: string; rank?: string; trainingClass?: string; page?: number } = {}) {
  return cachedRead(
    { name: "list-enrollments-for-review", key: [filters], tags: [CACHE_TAGS.enrollments], revalidate: 60 },
    async () => {
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
      if (filters.rank?.trim()) queries.push(Query.equal("rank_key", [filters.rank.trim()]));
      if (filters.trainingClass?.trim()) queries.push(Query.equal("training_class", [filters.trainingClass.trim()]));
      let students = await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [...queries, Query.limit(ENROLLMENTS_PAGE_SIZE), Query.offset((requestedPage - 1) * ENROLLMENTS_PAGE_SIZE)] });
      const totalPages = Math.ceil(students.total / ENROLLMENTS_PAGE_SIZE);
      const page = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
      if (page !== requestedPage) {
        students = await tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [...queries, Query.limit(ENROLLMENTS_PAGE_SIZE), Query.offset((page - 1) * ENROLLMENTS_PAGE_SIZE)] });
      }
      if (students.rows.length === 0) {
        return { rows: [], page, pageSize: ENROLLMENTS_PAGE_SIZE, total: students.total, totalPages };
      }
      const studentIds = students.rows.map((s) => s.$id);
      const [enrollments, documents] = await Promise.all([
        tables.listRows<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", studentIds), Query.limit(100)] }),
        tables.listRows<StudentDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.studentDocuments, queries: [Query.equal("student_id", studentIds), Query.limit(200)] })
      ]);
      const enrollmentByStudent = new Map<string, Enrollment>();
      for (const enrollment of enrollments.rows) {
        if (!enrollmentByStudent.has(enrollment.student_id)) {
          enrollmentByStudent.set(enrollment.student_id, enrollment);
        }
      }
      const photoByStudent = new Map<string, StudentDocument>();
      const pendingDocsByStudent = new Map<string, Set<"profile_photo" | "medical_certificate">>();
      const rejectedDocsByStudent = new Map<string, Set<"profile_photo" | "medical_certificate">>();
      for (const doc of documents.rows) {
        if (doc.document_type === "profile_photo" && !photoByStudent.has(doc.student_id)) {
          photoByStudent.set(doc.student_id, doc);
        }
        if (doc.status === "pending") {
          const set = pendingDocsByStudent.get(doc.student_id) ?? new Set();
          set.add(doc.document_type);
          pendingDocsByStudent.set(doc.student_id, set);
        } else if (doc.status === "rejected") {
          const set = rejectedDocsByStudent.get(doc.student_id) ?? new Set();
          set.add(doc.document_type);
          rejectedDocsByStudent.set(doc.student_id, set);
        }
      }
      const rows = students.rows.map((student) => {
        const photo = photoByStudent.get(student.$id);
        return {
          student,
          enrollment: enrollmentByStudent.get(student.$id) ?? null,
          profilePhotoDocumentId: photo?.status === "rejected" ? undefined : photo?.$id,
          pendingDocuments: [...(pendingDocsByStudent.get(student.$id) ?? [])],
          rejectedDocuments: [...(rejectedDocsByStudent.get(student.$id) ?? [])]
        };
      });
      return {
        rows: JSON.parse(JSON.stringify(rows)) as Array<{
          student: Student;
          enrollment: Enrollment | null;
          profilePhotoDocumentId?: string;
          pendingDocuments: Array<"profile_photo" | "medical_certificate">;
          rejectedDocuments: Array<"profile_photo" | "medical_certificate">;
        }>,
        page,
        pageSize: ENROLLMENTS_PAGE_SIZE,
        total: students.total,
        totalPages,
      };
    }
  );
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
