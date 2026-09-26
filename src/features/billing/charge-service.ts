import "server-only";

import { AppwriteException, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { chargeAdjustmentSchema } from "@/features/billing/schemas";
import { chargeRowId, competenceFromDate, effectiveChargeStatus, resolveDueDate } from "@/features/billing/rules";
import type { Charge, ChargeType } from "@/features/billing/types";
import type { CancellationRequest, Contract } from "@/features/contracts/types";
import { resolveStudentProfile } from "@/features/students/access";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import type { Enrollment } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

function asDateTime(date: string) {
  return date.includes("T") ? date : `${date}T12:00:00.000Z`;
}

async function createCharge(input: {
  enrollmentId: string; studentId: string; contractId?: string; type: ChargeType; competence: string;
  originId: string; amountCents: number; dueDate: string; description: string;
}) {
  const { tables, config } = createAppwriteAdminClient();
  const rowId = chargeRowId(input.enrollmentId, input.type, input.competence, input.originId);
  const now = new Date().toISOString();
  try {
    return await tables.createRow<Charge>({
      databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId,
      data: {
        enrollment_id: input.enrollmentId, student_id: input.studentId, contract_id: input.contractId,
        charge_type: input.type, competence: input.competence, origin_id: input.originId,
        amount_cents: input.amountCents, due_date: asDateTime(input.dueDate), status: "pending",
        description: input.description, created_at: now, updated_at: now
      }, permissions: []
    });
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
    return tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId });
  }
}

export async function createFirstMonthlyCharge(contract: Contract, enrollment: Enrollment) {
  if (!enrollment.first_due_date) throw new Error("first_due_date_required");
  return createCharge({
    enrollmentId: enrollment.$id, studentId: enrollment.student_id, contractId: contract.$id,
    type: "monthly_fee", competence: competenceFromDate(enrollment.first_due_date), originId: contract.$id,
    amountCents: contract.monthly_fee_cents, dueDate: enrollment.first_due_date,
    description: `Mensalidade ${competenceFromDate(enrollment.first_due_date)}`
  });
}

export async function createMonthlyCharge(contract: Contract, enrollment: Enrollment, competence: string) {
  if (!enrollment.approved_due_day) throw new Error("approved_due_day_required");
  return createCharge({
    enrollmentId: enrollment.$id, studentId: enrollment.student_id, contractId: contract.$id,
    type: "monthly_fee", competence, originId: contract.$id, amountCents: contract.monthly_fee_cents,
    dueDate: resolveDueDate(competence, enrollment.approved_due_day), description: `Mensalidade ${competence}`
  });
}

export async function createExamCharge(input: { enrollment: Enrollment; participantId: string; eventName: string; eventDate: string; amountCents: number }) {
  return createCharge({
    enrollmentId: input.enrollment.$id,
    studentId: input.enrollment.student_id,
    type: "exam_fee",
    competence: input.eventDate.slice(0, 7),
    originId: input.participantId,
    amountCents: input.amountCents,
    dueDate: input.eventDate.slice(0, 10),
    description: `Exame de faixa · ${input.eventName}`
  });
}

export async function cancelUnpaidExamCharge(charge: Charge, participantId: string) {
  if (!["pending", "overdue", "cancelled"].includes(charge.status)) throw new Error("exam_charge_not_cancellable");
  if (charge.status === "cancelled") return charge;
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  return tables.updateRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "cancelled", cancelled_at: now, cancellation_reason: `Participação em exame cancelada: ${participantId}`, updated_at: now } });
}

export async function getChargeForActor(actor: Profile, chargeId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: chargeId });
  const bundle = await getEnrollmentBundleByStudentId(charge.student_id);
  await resolveStudentProfile(actor, bundle.student.profile_id);
  if (actor.role === "minor_student") throw new Error("financial_access_denied");
  return { charge, bundle };
}

export async function listChargesForStudent(actor: Profile, profileId?: string) {
  if (actor.role === "minor_student") throw new Error("financial_access_denied");
  const target = await resolveStudentProfile(actor, profileId ?? actor.$id);
  const { tables, config } = createAppwriteAdminClient();
  const students = await tables.listRows({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [target.$id]), Query.limit(1)] });
  const student = students.rows[0];
  if (!student) return [];
  const rows: Charge[] = [];
  let cursor: string | undefined;
  do {
    const result = await tables.listRows<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("student_id", [student.$id]), Query.orderDesc("due_date"), Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...result.rows);
    cursor = result.rows.length === 500 ? result.rows.at(-1)?.$id : undefined;
  } while (cursor);
  const today = new Date().toISOString();
  return rows.map((charge) => ({ ...charge, status: effectiveChargeStatus(charge.status, charge.due_date, today) }));
}

export async function listCharges(filters: { status?: Charge["status"]; competence?: string; type?: ChargeType } = {}) {
  const { tables, config } = createAppwriteAdminClient();
  const queries = [Query.orderDesc("due_date")];
  if (filters.status) queries.push(Query.equal("status", [filters.status]));
  if (filters.competence) queries.push(Query.equal("competence", [filters.competence]));
  if (filters.type) queries.push(Query.equal("charge_type", [filters.type]));
  const rows: Charge[] = [];
  let cursor: string | undefined;
  do {
    const result = await tables.listRows<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [...queries, Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...result.rows);
    cursor = result.rows.length === 500 ? result.rows.at(-1)?.$id : undefined;
  } while (cursor);
  const today = new Date().toISOString();
  return rows.map((charge) => ({ ...charge, status: effectiveChargeStatus(charge.status, charge.due_date, today) }));
}

export async function adjustCharge(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = chargeAdjustmentSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: input.chargeId });
  if (!["pending", "overdue"].includes(charge.status)) throw new Error("charge_not_adjustable");
  const updated = await tables.updateRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { amount_cents: input.amountCents, due_date: asDateTime(input.dueDate), adjustment_reason: input.reason, updated_at: new Date().toISOString() } });
  await writeAuditEvent("billing.charge.adjusted", actor.account_id, "charge", charge.$id, { previous_amount_cents: charge.amount_cents, amount_cents: input.amountCents, reason: input.reason });
  return updated;
}

export async function applyApprovedCancellation(actor: Profile, request: CancellationRequest, feeCents: number) {
  const { tables, config } = createAppwriteAdminClient();
  const competence = request.target_exit_month.slice(0, 7);
  const rows = await tables.listRows<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("enrollment_id", [request.enrollment_id]), Query.equal("charge_type", ["monthly_fee"]), Query.limit(500)] });
  const now = new Date().toISOString();
  await Promise.all(rows.rows.filter((charge) => charge.competence >= competence && ["pending", "overdue"].includes(charge.status)).map((charge) => tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "cancelled", cancelled_at: now, cancellation_reason: `Cancelamento aprovado: ${request.$id}`, updated_at: now } })));
  if (feeCents > 0) await createCharge({ enrollmentId: request.enrollment_id, studentId: request.student_id, contractId: request.contract_id, type: "exit_fee", competence, originId: request.$id, amountCents: feeCents, dueDate: request.target_exit_month, description: "Encargo de saída fora do prazo" });
  await writeAuditEvent("billing.cancellation_applied", actor.account_id, "cancellation_request", request.$id, { competence, fee_cents: feeCents });
}
