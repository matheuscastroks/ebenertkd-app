import "server-only";

import { AppwriteException, ID, Permission, Query, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { createFirstMonthlyCharge } from "@/features/billing/charge-service";
import { buildSignedContractPdf } from "@/features/contracts/pdf";
import { canSignContract, hashContent, privacyIpFingerprint } from "@/features/contracts/rules";
import { signatureInputSchema } from "@/features/contracts/schemas";
import { getContractForActor } from "@/features/contracts/contract-service";
import type { Contract, ContractSignature } from "@/features/contracts/types";
import type { Enrollment } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

type SignatureContext = { ip?: string | null; userAgent?: string | null };

async function reconcileSignedContract(contract: Contract, signature: ContractSignature, pdfBytes: Uint8Array) {
  const { tables, storage, config } = createAppwriteAdminClient();
  const pdfHash = hashContent(pdfBytes);
  if (!contract.pdf_file_id) {
    try {
      await storage.createFile({ bucketId: APPWRITE_IDS.bucket, fileId: contract.$id, file: InputFile.fromBuffer(pdfBytes, `contrato-${contract.$id}.pdf`), permissions: [Permission.read(Role.user(signature.signer_account_id))] });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
    }
  }
  const now = signature.accepted_at;
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, rowId: contract.$id, data: { status: "signed", signature_id: signature.$id, pdf_file_id: contract.$id, pdf_hash: pdfHash, signed_at: now, updated_at: new Date().toISOString() } });
  const enrollment = await tables.getRow<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: contract.enrollment_id });
  if (enrollment.status === "awaiting_signature") {
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: contract.enrollment_id, data: { status: "active", updated_at: new Date().toISOString() } });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: enrollment.student_id, data: { status: "active", updated_at: new Date().toISOString() } });
  } else if (enrollment.status !== "active") throw new Error("enrollment_not_awaiting_signature");
  await createFirstMonthlyCharge(contract, enrollment);
  return { pdfHash };
}

export async function signContract(actor: Profile, raw: unknown, context: SignatureContext) {
  const input = signatureInputSchema.parse(raw);
  const { contract, bundle } = await getContractForActor(actor, input.contractId);
  if (!canSignContract({ role: actor.role, actorProfileId: actor.$id, studentProfileId: bundle.student.profile_id, capabilities: actor.capabilities, studentAccessGranted: true })) throw new Error("contract_signer_not_allowed");
  if (!['pending_signature', 'signed'].includes(contract.status)) throw new Error("contract_not_signable");
  if (hashContent(contract.content_snapshot) !== contract.content_hash) throw new Error("contract_content_changed");
  const { tables, config } = createAppwriteAdminClient();
  const existing = await tables.listRows<ContractSignature>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractSignatures, queries: [Query.equal("contract_id", [contract.$id]), Query.limit(1)] });
  const now = new Date().toISOString();
  const signature = existing.rows[0] ?? await tables.createRow<ContractSignature>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contractSignatures, rowId: ID.unique(), data: { contract_id: contract.$id, signer_profile_id: actor.$id, signer_account_id: actor.account_id, signer_name: actor.full_name, signature_data_url: input.signatureDataUrl, content_hash: contract.content_hash, ip_fingerprint: privacyIpFingerprint(context.ip), user_agent: context.userAgent?.slice(0, 512), accepted_at: now, created_at: now }, permissions: [] });
  const pdf = await buildSignedContractPdf(contract, signature.signer_name, signature.signature_data_url, signature.accepted_at);
  const result = await reconcileSignedContract(contract, signature, pdf);
  await writeAuditEvent("contract.signed", actor.account_id, "contract", contract.$id, { signer_profile_id: actor.$id, pdf_hash: result.pdfHash });
  return { contractId: contract.$id, ...result };
}

export async function downloadContractPdf(actor: Profile, contractId: string) {
  const { contract } = await getContractForActor(actor, contractId);
  if (!contract.signed_at || !contract.pdf_file_id || !contract.pdf_hash) throw new Error("signed_pdf_not_found");
  const { storage } = createAppwriteAdminClient();
  const buffer = await storage.getFileDownload({ bucketId: APPWRITE_IDS.bucket, fileId: contract.pdf_file_id });
  if (hashContent(new Uint8Array(buffer)) !== contract.pdf_hash) throw new Error("pdf_integrity_failed");
  return { buffer, contract };
}
