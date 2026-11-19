import "server-only";

import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { invalidateEventTags } from "@/features/events/event-service";
import { loadRegistrationForActor } from "@/features/events/registration-support";
import { canUploadRegistrationDocument, DOCUMENT_KIND_LABEL } from "@/features/events/rules/readiness-rules";
import { registrationDocumentKindSchema } from "@/features/events/schemas";
import { isEventTerminal } from "@/features/events/rules/status-rules";
import type { EventRegistrationDocument } from "@/features/events/types";
import { notifyAdmins, notifyStudentEvent } from "@/features/notifications/notification-service";
import { validateDocumentFile } from "@/features/students/rules";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { adminEventPath, guardianEventsPath, ROUTES } from "@/lib/navigation/routes";

/**
 * Anexa um documento da inscrição (autorização ou termo assinado, atestado, carteira da federação) no bucket
 * privado. Só o aluno adulto, o responsável do menor e a professora enviam; o menor nunca. Reenviar o mesmo
 * tipo substitui o arquivo anterior e volta para a análise.
 */
export async function uploadRegistrationDocument(actor: Profile, registrationId: string, rawKind: unknown, file: File) {
  const kind = registrationDocumentKindSchema.parse(rawKind);
  const { registration, event, student, isAdmin } = await loadRegistrationForActor(actor, registrationId);
  if (!student) throw new Error("registration_forbidden");
  if (!canUploadRegistrationDocument({ actorRole: actor.role, isOwnerOrGuardian: true })) throw new Error("registration_forbidden");
  if (isEventTerminal(event.status) || ["cancelled", "rejected"].includes(registration.status)) throw new Error("event_terminal");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateDocumentFile({ name: file.name, declaredType: file.type, size: file.size, bytes: bytes.slice(0, 16), documentType: "medical_certificate" });
  if (!validation.valid) throw new Error(validation.error);

  const { storage, tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const existing = (await tables.listRows<EventRegistrationDocument>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, queries: [Query.equal("registration_id", [registration.$id]), Query.equal("kind", [kind]), Query.limit(1)] })).rows[0];
  const now = new Date().toISOString();
  // Arquivo sem permissões próprias: só o servidor lê, e a rota de download confere o acesso.
  const createdFile = await storage.createFile({ bucketId: APPWRITE_IDS.bucket, fileId: ID.unique(), file: InputFile.fromBuffer(bytes, file.name), permissions: [] });
  try {
    const data = { registration_id: registration.$id, kind, file_id: createdFile.$id, original_name: file.name.slice(0, 255), mime_type: validation.mimeType, status: "pending" as const, rejection_reason: null, uploaded_by_account_id: actor.account_id, reviewed_by_account_id: null, reviewed_at: null, updated_at: now };
    const document = existing
      ? await tables.updateRow<EventRegistrationDocument>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, rowId: existing.$id, data })
      : await tables.createRow<EventRegistrationDocument>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, rowId: ID.unique(), permissions: [], data: { ...data, created_at: now } });
    if (existing) await storage.deleteFile({ bucketId: APPWRITE_IDS.bucket, fileId: existing.file_id }).catch(() => undefined);
    invalidateEventTags(event.$id, student.$id);
    await writeAuditEvent("event.document.uploaded", actor.account_id, "event_registration_document", document.$id, { event_id: event.$id, kind });
    if (!isAdmin) {
      await notifyAdmins({ title: "Documento de evento para revisar", body: `${student.full_name} enviou: ${DOCUMENT_KIND_LABEL[kind]} (${event.title}).`, dedupeKey: `event-document:${document.$id}:${now}`, actionUrl: `${adminEventPath(event.$id)}?aba=documentos` }).catch(() => undefined);
    }
    return document;
  } catch (error) {
    await storage.deleteFile({ bucketId: APPWRITE_IDS.bucket, fileId: createdFile.$id }).catch(() => undefined);
    throw error;
  }
}

async function loadDocumentWithRegistration(documentId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const document = await tables.getRow<EventRegistrationDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, rowId: documentId }).catch(() => {
    throw new Error("document_not_found");
  });
  return document;
}

/** Aprova ou recusa um documento (apenas professora). Recusa exige motivo e avisa a família. */
export async function reviewRegistrationDocument(actor: Profile, documentId: string, decision: "approved" | "rejected", reason?: string) {
  if (actor.role !== "admin") throw new Error("admin_required");
  if (decision === "rejected" && !reason?.trim()) throw new Error("rejection_reason_required");
  const document = await loadDocumentWithRegistration(documentId);
  if (document.status === decision) return document;
  const { event, student } = await loadRegistrationForActor(actor, document.registration_id);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const updated = await tables.updateRow<EventRegistrationDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, rowId: document.$id, data: { status: decision, rejection_reason: decision === "rejected" ? reason?.trim().slice(0, 255) : null, reviewed_by_account_id: actor.account_id, reviewed_at: now, updated_at: now } });
  invalidateEventTags(event.$id, student?.$id);
  await writeAuditEvent(`event.document.${decision}`, actor.account_id, "event_registration_document", document.$id, { event_id: event.$id, kind: document.kind });
  if (student) {
    await notifyStudentEvent({
      studentId: student.$id,
      audience: "family",
      title: decision === "approved" ? "Documento aprovado" : "Precisamos de um novo envio",
      body: decision === "approved" ? `${DOCUMENT_KIND_LABEL[document.kind]} aprovado para ${event.title}.` : `${DOCUMENT_KIND_LABEL[document.kind]} de ${event.title} foi recusado. Motivo: ${reason?.trim()}.`,
      dedupeKey: `event-document-reviewed:${document.$id}:${decision}:${now}`,
      studentActionUrl: ROUTES.studentEvents,
      guardianActionUrl: guardianEventsPath,
      actorAccountId: actor.account_id
    }).catch(() => undefined);
  }
  return updated;
}

/** Baixa o arquivo: a professora, o aluno adulto ou o responsável do menor. Nunca outro aluno. */
export async function downloadRegistrationDocument(actor: Profile, documentId: string) {
  const document = await loadDocumentWithRegistration(documentId);
  await loadRegistrationForActor(actor, document.registration_id);
  const { storage } = createAppwriteAdminClient();
  const buffer = await storage.getFileDownload({ bucketId: APPWRITE_IDS.bucket, fileId: document.file_id });
  return { buffer, document };
}
