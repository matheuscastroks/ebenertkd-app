import "server-only";

import { ID, Permission, Query, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { canAccessStudent } from "@/features/students/access";
import { recordReview } from "@/features/students/enrollment-service";
import { canRoleViewStudentDocument, validateDocumentFile } from "@/features/students/rules";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import type { DocumentType, StudentDocument } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { notifyAdmins } from "@/features/notifications/notification-service";

function filePermissions(target: Profile, actor: Profile) {
  const accountIds = new Set([target.account_id, actor.account_id]);
  return [...accountIds].map((accountId) => Permission.read(Role.user(accountId)));
}

export async function uploadStudentDocument(
  actor: Profile,
  target: Profile,
  studentId: string,
  documentType: DocumentType,
  file: File
) {
  const bundle = await getEnrollmentBundleByStudentId(studentId);
  if (bundle.student.profile_id !== target.$id || !(await canAccessStudent(actor, target.$id))) {
    throw new Error("student_access_denied");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateDocumentFile({
    name: file.name,
    declaredType: file.type,
    size: file.size,
    bytes: bytes.slice(0, 16),
    documentType
  });
  if (!validation.valid) throw new Error(validation.error);

  const { storage, tables, config } = createAppwriteAdminClient();
  const existing = bundle.documents.find((document) => document.document_type === documentType);
  const now = new Date().toISOString();
  const createdFile = await storage.createFile({
    bucketId: APPWRITE_IDS.bucket,
    fileId: ID.unique(),
    file: InputFile.fromBuffer(bytes, file.name),
    permissions: filePermissions(target, actor)
  });

  try {
    const data = {
      student_id: studentId,
      document_type: documentType,
      file_id: createdFile.$id,
      original_name: file.name,
      mime_type: validation.mimeType,
      size_bytes: file.size,
      status: "pending" as const,
      rejection_reason: null,
      uploaded_by_account_id: actor.account_id,
      updated_at: now
    };
    const document = existing
      ? await tables.updateRow<StudentDocument>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.studentDocuments,
          rowId: existing.$id,
          data
        })
      : await tables.createRow<StudentDocument>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.studentDocuments,
          rowId: ID.unique(),
          data: { ...data, created_at: now },
          permissions: filePermissions(target, actor)
        });
    if (existing) {
      await storage.deleteFile({ bucketId: APPWRITE_IDS.bucket, fileId: existing.file_id }).catch(() => undefined);
    }
    await writeAuditEvent("student.document.uploaded", actor.account_id, "student_document", document.$id, {
      student_id: studentId,
      document_type: documentType
    });
    await notifyAdmins({ title: "Documento aguardando análise", body: `${bundle.student.full_name} enviou ${documentType === "profile_photo" ? "uma foto de perfil" : "um atestado médico"}.`, dedupeKey: `document-pending:${document.$id}:${document.updated_at}`, actionUrl: `/admin/matriculas/${studentId}` }).catch(() => undefined);
    return document;
  } catch (error) {
    await storage.deleteFile({ bucketId: APPWRITE_IDS.bucket, fileId: createdFile.$id }).catch(() => undefined);
    throw error;
  }
}

export async function downloadStudentDocument(actor: Profile, documentId: string) {
  const { storage, tables, config } = createAppwriteAdminClient();
  const document = await tables.getRow<StudentDocument>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.studentDocuments,
    rowId: documentId
  });
  if (!canRoleViewStudentDocument(actor.role, document.document_type)) throw new Error("sensitive_document_access_denied");
  const bundle = await getEnrollmentBundleByStudentId(document.student_id);
  if (!(await canAccessStudent(actor, bundle.student.profile_id))) throw new Error("student_access_denied");
  const buffer = await storage.getFileDownload({ bucketId: APPWRITE_IDS.bucket, fileId: document.file_id });
  return { buffer, document };
}

export async function reviewStudentDocument(
  actor: Profile,
  documentId: string,
  decision: "approved" | "rejected",
  reason?: string
) {
  if (actor.role !== "admin") throw new Error("admin_required");
  if (decision === "rejected" && !reason?.trim()) throw new Error("rejection_reason_required");
  const { tables, config } = createAppwriteAdminClient();
  const document = await tables.getRow<StudentDocument>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.studentDocuments,
    rowId: documentId
  });
  const bundle = await getEnrollmentBundleByStudentId(document.student_id);
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.studentDocuments,
    rowId: documentId,
    data: { status: decision, rejection_reason: decision === "rejected" ? reason?.trim() : null, updated_at: new Date().toISOString() }
  });
  await recordReview(actor, document.student_id, bundle.enrollment.$id, `document_${decision}`, reason, {
    document_id: documentId,
    document_type: document.document_type
  });
}

export async function listEnrollmentReviews(studentId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.enrollmentReviews,
    queries: [Query.equal("student_id", [studentId]), Query.orderDesc("created_at"), Query.limit(50)]
  });
  return result.rows;
}
