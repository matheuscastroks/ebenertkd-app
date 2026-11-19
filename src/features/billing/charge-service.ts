import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { chargeAdjustmentSchema } from "@/features/billing/schemas";
import { getPolicy } from "@/features/academy/config-service";
import { enrollmentFeeToCharge } from "@/features/academy/policy-rules";
import { chargeRowId, competenceFromDate, effectiveChargeStatus, resolveDueDate } from "@/features/billing/rules";
import type { Charge, ChargeType } from "@/features/billing/types";
import type { CancellationRequest, Contract } from "@/features/contracts/types";
import { notifyStudentFinancial } from "@/features/notifications/notification-service";
import { resolveStudentProfile } from "@/features/students/access";
import { getEnrollmentBundleByStudentId } from "@/features/students/service";
import type { Enrollment } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";

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
    const created = await tables.createRow<Charge>({
      databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId,
      data: {
        enrollment_id: input.enrollmentId, student_id: input.studentId, contract_id: input.contractId,
        charge_type: input.type, competence: input.competence, origin_id: input.originId,
        amount_cents: input.amountCents, due_date: asDateTime(input.dueDate), status: "pending",
        description: input.description, created_at: now, updated_at: now
      }, permissions: []
    });
    invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(input.studentId));
    await notifyStudentFinancial({
      studentId: input.studentId,
      title: `Nova cobrança: ${input.description}`,
      body: `Valor de ${formatBrl(input.amountCents)} com vencimento em ${formatBusinessDateBr(input.dueDate)}. Você pode pagar por PIX e enviar o comprovante no financeiro.`,
      dedupeKey: `charge-created:${created.$id}`
    }).catch(() => undefined);
    return created;
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

/**
 * Taxa de matrícula (B3): gerada na aprovação só quando a política a habilita. Idempotente: o id da
 * cobrança é derivado de matrícula + tipo + competência + origem, então repetir não duplica.
 */
export async function createEnrollmentFeeCharge(enrollment: Enrollment) {
  const amountCents = enrollmentFeeToCharge(await getPolicy("billing"));
  if (amountCents == null) return null;
  if (!enrollment.first_due_date) throw new Error("first_due_date_required");
  return createCharge({
    enrollmentId: enrollment.$id, studentId: enrollment.student_id,
    type: "enrollment_fee", competence: competenceFromDate(enrollment.first_due_date), originId: enrollment.$id,
    amountCents, dueDate: enrollment.first_due_date,
    description: "Taxa de matrícula"
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
  const updated = await tables.updateRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "cancelled", cancelled_at: now, cancellation_reason: `Participação em exame cancelada: ${participantId}`, updated_at: now } });
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(charge.student_id));
  return updated;
}

export type EventChargeItem = "academy" | "federation";

/**
 * Cobrança de evento (`event_fee`): idempotente por inscrição + item (`academy` = custos da academia,
 * `federation` = taxa da federação). A origem é o hash de `registration_id:item`.
 */
export async function createEventCharge(input: { enrollment: Enrollment; registrationId: string; item: EventChargeItem; eventTitle: string; eventDate: string; amountCents: number }) {
  const originId = createHash("sha256").update(`${input.registrationId}:${input.item}`).digest("hex").slice(0, 36);
  const suffix = input.item === "federation" ? " · Taxa da federação" : "";
  return createCharge({
    enrollmentId: input.enrollment.$id,
    studentId: input.enrollment.student_id,
    type: "event_fee",
    competence: input.eventDate.slice(0, 7),
    originId,
    amountCents: input.amountCents,
    dueDate: input.eventDate.slice(0, 10),
    description: `Evento · ${input.eventTitle}${suffix}`.slice(0, 255)
  });
}

export async function cancelUnpaidEventCharge(charge: Charge, reason: string) {
  if (!["pending", "overdue", "cancelled"].includes(charge.status)) throw new Error("event_charge_not_cancellable");
  if (charge.status === "cancelled") return charge;
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const updated = await tables.updateRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "cancelled", cancelled_at: now, cancellation_reason: reason.slice(0, 500), updated_at: now } });
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(charge.student_id));
  return updated;
}

/** Reabre a cobrança de uma inscrição cancelada que voltou a ser confirmada (mesma origem, mesmo id). */
export async function reopenEventCharge(charge: Charge, amountCents: number) {
  if (charge.status !== "cancelled") return charge;
  const { tables, config } = createAppwriteAdminClient();
  const updated = await tables.updateRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "pending", amount_cents: amountCents, cancelled_at: null, cancellation_reason: null, updated_at: new Date().toISOString() } });
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(charge.student_id));
  return updated;
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

export function listCharges(filters: { status?: Charge["status"]; competence?: string; type?: ChargeType } = {}) {
  return cachedRead(
    { name: "list-charges", key: [filters], tags: [CACHE_TAGS.billingCharges], revalidate: 60 },
    async () => {
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
  );
}

export async function adjustCharge(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = chargeAdjustmentSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: input.chargeId });
  if (!["pending", "overdue"].includes(charge.status)) throw new Error("charge_not_adjustable");
  const updated = await tables.updateRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { amount_cents: input.amountCents, due_date: asDateTime(input.dueDate), adjustment_reason: input.reason, updated_at: new Date().toISOString() } });
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(charge.student_id));
  await writeAuditEvent("billing.charge.adjusted", actor.account_id, "charge", charge.$id, { previous_amount_cents: charge.amount_cents, amount_cents: input.amountCents, reason: input.reason });
  await notifyStudentFinancial({
    studentId: charge.student_id,
    title: `Cobrança atualizada: ${charge.description}`,
    body: `O professor atualizou o valor para ${formatBrl(input.amountCents)} com vencimento em ${formatBusinessDateBr(input.dueDate)}.`,
    dedupeKey: `charge-adjusted:${charge.$id}:${updated.updated_at}`
  }).catch(() => undefined);
  return updated;
}

export async function applyApprovedCancellation(actor: Profile, request: CancellationRequest, feeCents: number) {
  const { tables, config } = createAppwriteAdminClient();
  const competence = request.target_exit_month.slice(0, 7);
  const rows = await tables.listRows<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("enrollment_id", [request.enrollment_id]), Query.equal("charge_type", ["monthly_fee"]), Query.limit(500)] });
  const now = new Date().toISOString();
  await Promise.all(rows.rows.filter((charge) => charge.competence >= competence && ["pending", "overdue"].includes(charge.status)).map((charge) => tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: charge.$id, data: { status: "cancelled", cancelled_at: now, cancellation_reason: `Cancelamento aprovado: ${request.$id}`, updated_at: now } })));
  if (feeCents > 0) await createCharge({ enrollmentId: request.enrollment_id, studentId: request.student_id, contractId: request.contract_id, type: "exit_fee", competence, originId: request.$id, amountCents: feeCents, dueDate: request.target_exit_month, description: "Encargo de saída fora do prazo" });
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(request.student_id));
  await writeAuditEvent("billing.cancellation_applied", actor.account_id, "cancellation_request", request.$id, { competence, fee_cents: feeCents });
}
