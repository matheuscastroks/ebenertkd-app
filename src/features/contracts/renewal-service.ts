import "server-only";

import { Query } from "node-appwrite";
import { renewalEvent } from "@/features/contracts/rules";
import type { Contract } from "@/features/contracts/types";
import type { Profile } from "@/features/auth/types";
import { renewalSchema } from "@/features/contracts/schemas";
import { issueContractForEnrollment } from "@/features/contracts/contract-service";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import { writeAuditEvent } from "@/features/auth/service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export async function listContractsRequiringRenewal(referenceDate = new Date().toISOString()) {
  const { tables, config } = createAppwriteAdminClient();
  const rows = await tables.listRows<Contract>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, queries: [Query.equal("status", ["signed"]), Query.limit(500)] });
  return rows.rows.map((contract) => ({ contract, event: renewalEvent(contract.ends_at, referenceDate) })).filter((item) => item.event);
}

export async function renewContract(actor: Profile, raw: unknown) {
  const input = renewalSchema.parse(raw);
  const bundle = await getEnrollmentBundleByStudentId(input.studentId);
  if (bundle.enrollment.status !== "awaiting_renewal") throw new Error("enrollment_not_awaiting_renewal");
  const { tables, config } = createAppwriteAdminClient();
  const previousRows = await tables.listRows<Contract>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, queries: [Query.equal("student_id", [input.studentId]), Query.orderDesc("ends_at"), Query.limit(1)] });
  const previous = previousRows.rows[0];
  if (!previous) throw new Error("previous_contract_required");
  const startsAt = new Date(previous.ends_at);
  startsAt.setUTCDate(startsAt.getUTCDate() + 1);
  const endsAt = new Date(`${input.endsAt}T12:00:00Z`);
  if (endsAt <= startsAt) throw new Error("invalid_renewal_period");
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: bundle.enrollment.$id, data: { contract_start: startsAt.toISOString(), contract_end: endsAt.toISOString(), status: "under_review", updated_at: new Date().toISOString() } });
  let contract: Contract;
  try {
    contract = await issueContractForEnrollment(actor, input.studentId);
  } catch (error) {
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: bundle.enrollment.$id, data: { contract_start: bundle.enrollment.contract_start, contract_end: bundle.enrollment.contract_end, status: "awaiting_renewal", updated_at: new Date().toISOString() } });
    throw error;
  }
  await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: bundle.enrollment.$id, data: { status: "awaiting_signature", updated_at: new Date().toISOString() } });
  await writeAuditEvent("contract.renewed", actor.account_id, "contract", contract.$id, { previous_contract_id: previous.$id });
  return contract;
}
