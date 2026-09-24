import "server-only";

import { ID, Permission, Query, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { getChargeForActor } from "@/features/billing/charge-service";
import type { PaymentProof } from "@/features/billing/types";
import { detectFileKind, MAX_DOCUMENT_BYTES } from "@/features/students/rules";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { notifyAdmins } from "@/features/notifications/notification-service";

function validateProof(file: File, bytes: Uint8Array) {
  if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) throw new Error("invalid_size");
  const detected = detectFileKind(bytes.slice(0, 16));
  if (!detected || detected !== file.type) throw new Error("invalid_signature");
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(detected)) throw new Error("invalid_type");
  return detected;
}

export async function uploadPaymentProof(actor: Profile, chargeId: string, file: File) {
  const { charge, bundle } = await getChargeForActor(actor, chargeId);
  if (!["pending", "overdue", "proof_under_review"].includes(charge.status)) throw new Error("charge_does_not_accept_proof");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = validateProof(file, bytes);
  const { storage, tables, config } = createAppwriteAdminClient();
  const profileId = bundle.student.profile_id;
  const target = await tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: profileId });
  const accountIds = new Set([actor.account_id, target.account_id]);
  const permissions = [...accountIds].map((id) => Permission.read(Role.user(id)));
  const previous = await tables.listRows<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, queries: [Query.equal("charge_id", [charge.$id]), Query.orderDesc("version"), Query.limit(1)] });
  const version = (previous.rows[0]?.version ?? 0) + 1;
  const fileRow = await storage.createFile({ bucketId: APPWRITE_IDS.bucket, fileId: ID.unique(), file: InputFile.fromBuffer(bytes, file.name), permissions });
  const now = new Date().toISOString();
  try {
    const proof = await tables.createRow<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: ID.unique(), data: { charge_id: charge.$id, file_id: fileRow.$id, original_name: file.name, mime_type: mimeType, size_bytes: file.size, version, status: "pending", uploaded_by_account_id: actor.account_id, created_at: now, updated_at: now }, permissions: [] });
    if (previous.rows[0]?.status === "pending") await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: previous.rows[0].$id, data: { status: "superseded", updated_at: now } });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "proof_under_review", updated_at: now } });
    await writeAuditEvent("billing.proof.uploaded", actor.account_id, "payment_proof", proof.$id, { charge_id: charge.$id, version });
    await notifyAdmins({ title: "Comprovante aguardando análise", body: `${bundle.student.full_name} enviou um comprovante de pagamento.`, dedupeKey: `payment-proof-pending:${proof.$id}`, actionUrl: "/admin/financeiro" }).catch(() => undefined);
    return proof;
  } catch (error) {
    await storage.deleteFile({ bucketId: APPWRITE_IDS.bucket, fileId: fileRow.$id }).catch(() => undefined);
    throw error;
  }
}

export async function listProofsForCharge(chargeId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const result = await tables.listRows<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, queries: [Query.equal("charge_id", [chargeId]), Query.orderDesc("version"), Query.limit(20)] });
  return result.rows;
}

export async function downloadPaymentProof(actor: Profile, proofId: string) {
  if (actor.role === "minor_student") throw new Error("financial_access_denied");
  const { storage, tables, config } = createAppwriteAdminClient();
  const proof = await tables.getRow<PaymentProof>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.paymentProofs, rowId: proofId });
  await getChargeForActor(actor, proof.charge_id);
  const buffer = await storage.getFileDownload({ bucketId: APPWRITE_IDS.bucket, fileId: proof.file_id });
  return { buffer, proof };
}
