import "server-only";

import { ID, Query, type Models } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { renderContractTemplate, hashContent } from "@/features/contracts/rules";
import { getPublishedContractVersion } from "@/features/contracts/template-service";
import type { Contract } from "@/features/contracts/types";
import { resolveStudentProfile } from "@/features/students/access";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

const dateLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
const moneyLabel = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

async function guardianForStudentProfile(studentProfileId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const links = await tables.listRows<Models.Row & { guardian_profile_id: string }>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.guardianStudentLinks, queries: [Query.equal("student_profile_id", [studentProfileId]), Query.equal("status", ["active"]), Query.limit(1)] });
  const id = links.rows[0]?.guardian_profile_id;
  return id ? tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: id }) : null;
}

export async function issueContractForEnrollment(actor: Profile, studentId: string) {
  const bundle = await getEnrollmentBundleByStudentId(studentId);
  const { enrollment, student } = bundle;
  if (!enrollment.contract_start || !enrollment.contract_end || enrollment.monthly_fee_cents == null || enrollment.approved_due_day == null) throw new Error("contract_terms_incomplete");
  const { tables, config } = createAppwriteAdminClient();
  const existing = await tables.listRows<Contract>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, queries: [Query.equal("enrollment_id", [enrollment.$id]), Query.equal("status", ["pending_signature"]), Query.orderDesc("$createdAt"), Query.limit(1)] });
  if (existing.rows[0]) return existing.rows[0];

  const [version, studentProfile] = await Promise.all([
    getPublishedContractVersion(),
    tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: student.profile_id })
  ]);
  const guardian = studentProfile.role === "minor_student" ? await guardianForStudentProfile(student.profile_id) : null;
  if (studentProfile.role === "minor_student" && !guardian) throw new Error("guardian_required_for_contract");
  const snapshot = renderContractTemplate(version.content, {
    "student.full_name": student.full_name,
    "student.cpf": student.cpf ?? "não informado",
    "guardian.full_name": guardian?.full_name ?? "não se aplica",
    "academy.name": "Ebenert KD",
    "financial.monthly_fee": moneyLabel(enrollment.monthly_fee_cents - (enrollment.discount_cents ?? 0)),
    "financial.due_day": String(enrollment.approved_due_day),
    "contract.starts_at": dateLabel(enrollment.contract_start),
    "contract.ends_at": dateLabel(enrollment.contract_end)
  });
  const now = new Date().toISOString();
  const contract = await tables.createRow<Contract>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, rowId: ID.unique(), data: { enrollment_id: enrollment.$id, student_id: student.$id, version_id: version.$id, version_number: version.version, status: "pending_signature", content_snapshot: snapshot, content_hash: hashContent(snapshot), student_name: student.full_name, guardian_name: guardian?.full_name, monthly_fee_cents: enrollment.monthly_fee_cents - (enrollment.discount_cents ?? 0), starts_at: enrollment.contract_start, ends_at: enrollment.contract_end, created_by_account_id: actor.account_id, created_at: now, updated_at: now }, permissions: [] });
  await writeAuditEvent("contract.issued", actor.account_id, "contract", contract.$id, { enrollment_id: enrollment.$id, version: version.version });
  return contract;
}

export async function getContract(contractId: string) {
  const { tables, config } = createAppwriteAdminClient();
  return tables.getRow<Contract>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, rowId: contractId });
}

export async function getContractForActor(actor: Profile, contractId: string) {
  const contract = await getContract(contractId);
  const bundle = await getEnrollmentBundleByStudentId(contract.student_id);
  await resolveStudentProfile(actor, bundle.student.profile_id);
  return { contract, bundle };
}

export async function listStudentContracts(actor: Profile, studentProfileId?: string) {
  const target = await resolveStudentProfile(actor, studentProfileId ?? actor.$id);
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows<Models.Row>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [target.$id]), Query.limit(1)] });
  if (!students.rows[0]) return [];
  const rows = await tables.listRows<Contract>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.contracts, queries: [Query.equal("student_id", [students.rows[0].$id]), Query.orderDesc("$createdAt"), Query.limit(20)] });
  return rows.rows;
}
