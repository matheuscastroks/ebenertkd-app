import "server-only";

import { unstable_cache } from "next/cache";
import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { applyApprovedCancellation } from "@/features/billing/charge-service";
import { getContractForActor } from "@/features/contracts/contract-service";
import { cancellationDecisionSchema, cancellationRequestSchema } from "@/features/contracts/schemas";
import type { CancellationRequest } from "@/features/contracts/types";
import { calculateExitFee } from "@/lib/domain/billing-rules";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { CACHE_TAGS } from "@/lib/cache/tags";

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function requestCancellation(actor: Profile, raw: unknown) {
  const input = cancellationRequestSchema.parse(raw);
  const { contract } = await getContractForActor(actor, input.contractId);
  if (contract.status !== "signed") throw new Error("signed_contract_required");
  const { tables, config } = createAppwriteAdminClient();
  const pending = await tables.listRows<CancellationRequest>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.cancellationRequests, queries: [Query.equal("contract_id", [contract.$id]), Query.equal("status", ["pending"]), Query.limit(1)] });
  if (pending.rows[0]) return pending.rows[0];
  const noticeDate = saoPauloDate();
  const fee = calculateExitFee({ targetExitMonth: `${input.targetExitMonth}-01`, noticeDate, monthlyFeeInCents: contract.monthly_fee_cents });
  const now = new Date().toISOString();
  const request = await tables.createRow<CancellationRequest>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.cancellationRequests, rowId: ID.unique(), data: { contract_id: contract.$id, enrollment_id: contract.enrollment_id, student_id: contract.student_id, requested_by_profile_id: actor.$id, target_exit_month: new Date(`${input.targetExitMonth}-01T12:00:00Z`).toISOString(), notice_date: new Date(`${noticeDate}T12:00:00Z`).toISOString(), suggested_fee_cents: fee, status: "pending", reason: input.reason, created_at: now, updated_at: now }, permissions: [] });
  await writeAuditEvent("contract.cancellation_requested", actor.account_id, "cancellation_request", request.$id, { suggested_fee_cents: fee });
  return request;
}

export const listCancellationRequests = unstable_cache(
  async (status?: CancellationRequest["status"]) => {
    const { tables, config } = createAppwriteAdminClient();
    const queries = [Query.orderDesc("created_at"), Query.limit(50)];
    if (status) queries.unshift(Query.equal("status", [status]));
    const rows = await tables.listRows<CancellationRequest>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.cancellationRequests, queries });
    return rows.rows;
  },
  ["list-cancellation-requests"],
  { tags: [CACHE_TAGS.cancellations], revalidate: 60 }
);

export async function decideCancellation(actor: Profile, raw: unknown) {
  const input = cancellationDecisionSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const request = await tables.getRow<CancellationRequest>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.cancellationRequests, rowId: input.requestId });
  if (request.status !== "pending") return request;
  const now = new Date().toISOString();
  const updated = await tables.updateRow<CancellationRequest>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.cancellationRequests, rowId: request.$id, data: { status: input.decision, decided_fee_cents: input.decision === "approved" ? input.feeCents : 0, decision_notes: input.notes, decided_by_account_id: actor.account_id, decided_at: now, updated_at: now } });
  if (input.decision === "approved") {
    await applyApprovedCancellation(actor, request, input.feeCents);
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, rowId: request.contract_id, data: { status: "cancelled", updated_at: now } });
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: request.enrollment_id, data: { status: "cancelled", updated_at: now } });
  }
  await writeAuditEvent(`contract.cancellation_${input.decision}`, actor.account_id, "cancellation_request", request.$id, { fee_cents: input.feeCents, notes: input.notes });
  return updated;
}
