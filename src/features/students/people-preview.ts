import "server-only";

import { Query } from "node-appwrite";
import { studentPhotoUrl, type StudentPreview } from "@/features/students/photo-url";
import type { Student, StudentDocument } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

const CHUNK = 100;

function chunks<T>(items: readonly T[]) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

/** Nome e foto (por documento autorizado) de cada aluno, para grupos de avatares nas listas. */
export async function getStudentPreviews(studentIds: readonly string[]): Promise<Map<string, StudentPreview>> {
  const ids = [...new Set(studentIds)];
  const result = new Map<string, StudentPreview>();
  if (ids.length === 0) return result;
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const [students, photos] = await Promise.all([
    Promise.all(chunks(ids).map((part) => tables.listRows<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("$id", part), Query.limit(CHUNK)] }))),
    Promise.all(chunks(ids).map((part) => tables.listRows<StudentDocument>({ databaseId, tableId: APPWRITE_IDS.tables.studentDocuments, queries: [Query.equal("student_id", part), Query.equal("document_type", ["profile_photo"]), Query.limit(500)] })))
  ]);
  const photoByStudent = new Map(photos.flatMap((page) => page.rows).filter((photo) => photo.status !== "rejected").map((photo) => [photo.student_id, photo.$id]));
  for (const student of students.flatMap((page) => page.rows)) {
    const photoDocumentId = photoByStudent.get(student.$id);
    result.set(student.$id, { name: student.full_name, photoDocumentId, imageUrl: studentPhotoUrl(photoDocumentId) });
  }
  return result;
}
