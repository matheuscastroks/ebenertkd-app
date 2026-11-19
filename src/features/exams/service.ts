import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { cancelUnpaidExamCharge, createExamCharge } from "@/features/billing/charge-service";
import type { Charge } from "@/features/billing/types";
import { beltNameOf, findRank, toPublicRank } from "@/features/academy/belt-rules";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { isRankKey } from "@/features/academy/ranks";
import { assertNextGraduation, assertPromotion, examChargeCancellation, examFeeCents, type PaidChargeDecision } from "@/features/exams/rules";
import { examEventSchema, examParticipantSchema, examResultSchema } from "@/features/exams/schemas";
import type { BeltHistory, ExamEvent, ExamParticipant } from "@/features/exams/types";
import { notifyStudentEvent } from "@/features/notifications/notification-service";
import type { Enrollment, Student, StudentDocument } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { formatBusinessDateBr } from "@/lib/dates";
import { guardianExamsPath, ROUTES } from "@/lib/navigation/routes";

const dateTime = (date: string) => `${date}T12:00:00.000Z`;
const stableId = (...parts: string[]) => createHash("sha256").update(parts.join(":" )).digest("hex").slice(0, 36);

export async function createExamEvent(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = examEventSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const event = await tables.createRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: ID.unique(), permissions: [], data: { name: input.name, event_date: dateTime(input.eventDate), location: input.location, default_fee_cents: input.defaultFeeCents, status: "planned", created_by_account_id: actor.account_id, created_at: now, updated_at: now } });
  invalidateTags(CACHE_TAGS.examEvents, CACHE_TAGS.examEvent(event.$id));
  await writeAuditEvent("exam.event.created", actor.account_id, "exam_event", event.$id, { event_date: input.eventDate });
  return event;
}

export function listExamEvents() {
  return cachedRead(
    { name: "list-exam-events", key: [], tags: [CACHE_TAGS.examEvents], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      return (await tables.listRows<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, queries: [Query.orderDesc("event_date"), Query.limit(100)] })).rows;
    }
  );
}

export type ExamEventWithStats = ExamEvent & {
  participantCount: number;
  totalFeesCents: number;
};

export type ExamsOverview = {
  events: ExamEventWithStats[];
  nextUpcomingEvent: ExamEvent | null;
  daysUntilNext: number | null;
  totalActiveParticipants: number;
  totalProjectedRevenueCents: number;
};

export function getExamsOverview(): Promise<ExamsOverview> {
  return cachedRead(
    { name: "get-exams-overview", key: [], tags: [CACHE_TAGS.examEvents], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const [eventsResult, participantsResult] = await Promise.all([
        tables.listRows<ExamEvent>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.examEvents,
          queries: [Query.orderDesc("event_date"), Query.limit(100)],
        }),
        tables.listRows<ExamParticipant>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.examParticipants,
          queries: [Query.limit(5000)],
        }),
      ]);

      const events = eventsResult.rows;
      const nonCancelledParticipants = participantsResult.rows.filter((p) => p.status !== "cancelled");

      const participantsByEvent = new Map<string, ExamParticipant[]>();
      for (const p of nonCancelledParticipants) {
        const list = participantsByEvent.get(p.event_id) ?? [];
        list.push(p);
        participantsByEvent.set(p.event_id, list);
      }

      const today = new Date().toISOString().slice(0, 10);
      const activeEvents = events.filter((e) => e.status !== "cancelled");
      const upcomingEvents = activeEvents
        .filter((e) => e.event_date.slice(0, 10) >= today)
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
      const nextUpcomingEvent = upcomingEvents[0] ?? null;

      let daysUntilNext: number | null = null;
      if (nextUpcomingEvent) {
        const targetDate = new Date(nextUpcomingEvent.event_date);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - currentDate.getTime();
        daysUntilNext = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      const eventsWithStats: ExamEventWithStats[] = events.map((event) => {
        const eventParticipants = participantsByEvent.get(event.$id) ?? [];
        const totalFeesCents = eventParticipants.reduce((sum, p) => sum + (p.fee_cents || 0), 0);
        return {
          ...event,
          participantCount: eventParticipants.length,
          totalFeesCents,
        };
      });

      const totalActiveParticipants = nonCancelledParticipants.filter((p) => p.status === "registered").length;
      const totalProjectedRevenueCents = eventsWithStats
        .filter((e) => e.status !== "cancelled")
        .reduce((sum, e) => sum + e.totalFeesCents, 0);

      return {
        events: eventsWithStats,
        nextUpcomingEvent,
        daysUntilNext,
        totalActiveParticipants,
        totalProjectedRevenueCents,
      };
    }
  );
}

export function getExamEvent(eventId: string) {
  return cachedRead(
    { name: "get-exam-event", key: [eventId], tags: [CACHE_TAGS.examEvents, CACHE_TAGS.examEvent(eventId)], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      return tables.getRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: eventId });
    }
  );
}

export async function cancelExamEvent(actor: Profile, eventId: string) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  const [event, activeParticipants] = await Promise.all([
    tables.getRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: eventId }),
    tables.listRows<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("event_id", [eventId]), Query.equal("status", ["registered"]), Query.limit(1)] })
  ]);
  if (event.status === "cancelled") return event;
  if (event.status === "completed") throw new Error("exam_event_completed");
  if (activeParticipants.total > 0) throw new Error("exam_event_has_active_participants");
  const updated = await tables.updateRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: eventId, data: { status: "cancelled", updated_at: new Date().toISOString() } });
  invalidateTags(CACHE_TAGS.examEvents, CACHE_TAGS.examEvent(eventId));
  await writeAuditEvent("exam.event.cancelled", actor.account_id, "exam_event", eventId);
  return updated;
}

export function getExamEventBundle(eventId: string) {
  return cachedRead(
    { name: "get-exam-event-bundle", key: [eventId], tags: [CACHE_TAGS.examEvents, CACHE_TAGS.examEvent(eventId), CACHE_TAGS.billingCharges, CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const event = await tables.getRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: eventId });
      const participants = (await tables.listRows<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("event_id", [eventId]), Query.limit(500)] })).rows;
      const participantStudentIds = participants.map((participant) => participant.student_id);
      const activeEnrollments = (await tables.listRows<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("status", ["active"]), Query.limit(500)] })).rows;
      const allStudentIds = [...new Set([...participantStudentIds, ...activeEnrollments.map((enrollment) => enrollment.student_id)])];
      const [students, photos] = allStudentIds.length === 0 ? [{ rows: [] as Student[] }, { rows: [] as StudentDocument[] }] : await Promise.all([
        tables.listRows<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("$id", allStudentIds), Query.limit(500)] }),
        tables.listRows<StudentDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.studentDocuments, queries: [Query.equal("student_id", allStudentIds), Query.equal("document_type", ["profile_photo"]), Query.limit(500)] })
      ]);
      const chargeIds = participants.flatMap((participant) => participant.charge_id ? [participant.charge_id] : []);
      const charges = chargeIds.length === 0 ? [] : (await tables.listRows<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("$id", chargeIds), Query.limit(500)] })).rows;
      const studentById = new Map(students.rows.map((student) => [student.$id, student]));
      const enrollmentByStudent = new Map(activeEnrollments.map((enrollment) => [enrollment.student_id, enrollment]));
      const photoByStudent = new Map(photos.rows.filter((photo) => photo.status !== "rejected").map((photo) => [photo.student_id, photo.$id]));
      const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
      const participantIds = new Set(participants.map((participant) => participant.student_id));
      return {
        event,
        participants: participants.map((participant) => ({ participant, student: studentById.get(participant.student_id), photoDocumentId: photoByStudent.get(participant.student_id), charge: participant.charge_id ? chargeById.get(participant.charge_id) : undefined })).filter((row) => row.student),
        eligibleStudents: activeEnrollments.map((enrollment) => ({ enrollment, student: studentById.get(enrollment.student_id), photoDocumentId: photoByStudent.get(enrollment.student_id) })).filter((row) => row.student && !participantIds.has(row.enrollment.student_id) && Boolean(row.student.rank_key))
      };
    }
  );
}

export async function addExamParticipant(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = examParticipantSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const [ranks, examPolicy, event, student, enrollments] = await Promise.all([
    getBeltRanks(),
    getPolicy("exam"),
    tables.getRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: input.eventId }),
    tables.getRow<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: input.studentId }),
    tables.listRows<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [input.studentId]), Query.equal("status", ["active"]), Query.limit(1)] })
  ]);
  if (["completed", "cancelled"].includes(event.status)) throw new Error("exam_event_closed");
  const enrollment = enrollments.rows[0];
  if (!enrollment) throw new Error("active_enrollment_required");
  assertNextGraduation(ranks.map(toPublicRank), student.rank_key, input.targetRankKey, examPolicy.allow_skip_grades);
  const targetRank = findRank(ranks, input.targetRankKey)!;
  const feeCents = input.feeCents ?? examFeeCents(targetRank.exam_fee_cents, event.default_fee_cents);
  const participantId = stableId(event.$id, student.$id);
  const now = new Date().toISOString();
  let participant: ExamParticipant;
  try {
    participant = await tables.createRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participantId, permissions: [], data: { event_id: event.$id, enrollment_id: enrollment.$id, student_id: student.$id, target_rank_key: input.targetRankKey, fee_cents: feeCents, status: "registered", created_at: now, updated_at: now } });
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
    participant = await tables.getRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participantId });
  }
  if (participant.status === "cancelled") throw new Error("exam_participant_cancelled");
  const charge = await createExamCharge({ enrollment, participantId: participant.$id, eventName: event.name, eventDate: event.event_date, amountCents: participant.fee_cents });
  if (participant.charge_id !== charge.$id) participant = await tables.updateRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participant.$id, data: { charge_id: charge.$id, updated_at: now } });
  if (event.status === "planned") await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: event.$id, data: { status: "confirmed", updated_at: now } });
  invalidateTags(CACHE_TAGS.examEvents, CACHE_TAGS.examEvent(event.$id), CACHE_TAGS.exams(student.$id), CACHE_TAGS.billingCharges, CACHE_TAGS.charges(student.$id));
  await writeAuditEvent("exam.participant.added", actor.account_id, "exam_participant", participant.$id, { charge_id: charge.$id });
  await notifyStudentEvent({
    studentId: student.$id,
    audience: "family",
    title: `Inscrição confirmada: ${event.name}`,
    body: `O professor inscreveu ${student.full_name} no exame para Faixa ${targetRank.display_name} em ${formatBusinessDateBr(event.event_date)}.`,
    dedupeKey: `exam-registered:${participant.$id}`,
    studentActionUrl: ROUTES.studentExams,
    guardianActionUrl: guardianExamsPath,
    actorAccountId: actor.account_id
  }).catch(() => undefined);
  return participant;
}

export async function cancelExamParticipant(actor: Profile, participantId: string, decision?: PaidChargeDecision) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  const participant = await tables.getRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participantId });
  if (participant.status === "cancelled") return participant;
  if (participant.status !== "registered") throw new Error("exam_participant_already_graded");
  let financialDecision = decision;
  if (participant.charge_id) {
    const charge = await tables.getRow<Charge>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.charges, rowId: participant.charge_id });
    const handling = examChargeCancellation(charge.status, decision);
    if (handling === "cancel") {
      await cancelUnpaidExamCharge(charge, participant.$id);
      financialDecision = undefined;
    }
  }
  const now = new Date().toISOString();
  const updated = await tables.updateRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participant.$id, data: { status: "cancelled", financial_decision: financialDecision, updated_at: now } });
  invalidateTags(CACHE_TAGS.examEvents, CACHE_TAGS.examEvent(participant.event_id), CACHE_TAGS.exams(participant.student_id), CACHE_TAGS.billingCharges, CACHE_TAGS.charges(participant.student_id));
  await writeAuditEvent("exam.participant.cancelled", actor.account_id, "exam_participant", participant.$id, { financial_decision: financialDecision });
  return updated;
}

export async function recordExamResult(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = examResultSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const participant = await tables.getRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: input.participantId });
  if (["approved", "failed", "absent"].includes(participant.status)) return participant;
  if (participant.status !== "registered") throw new Error("exam_participant_not_gradable");
  const [ranks, student, event, openParticipants] = await Promise.all([
    getBeltRanks(),
    tables.getRow<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: participant.student_id }),
    tables.getRow<ExamEvent>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: participant.event_id }),
    tables.listRows<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("event_id", [participant.event_id]), Query.equal("status", ["registered"]), Query.limit(500)] })
  ]);
  if (event.status === "cancelled") throw new Error("exam_event_cancelled");
  const now = new Date().toISOString();
  const transaction = await tables.createTransaction({ ttl: 60 });
  try {
    if (input.result === "approved") {
      if (!isRankKey(participant.target_rank_key)) throw new Error("exam_graduation_mismatch");
      assertPromotion(student.rank_key, participant.target_rank_key);
      await tables.createRow<BeltHistory>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.beltHistory, rowId: stableId("belt-history", participant.$id), permissions: [], transactionId: transaction.$id, data: { student_id: student.$id, event_id: event.$id, exam_participant_id: participant.$id, previous_rank_key: student.rank_key!, new_rank_key: participant.target_rank_key, previous_belt_name: beltNameOf(ranks.map(toPublicRank), student.rank_key), new_belt_name: beltNameOf(ranks.map(toPublicRank), participant.target_rank_key), achieved_at: event.event_date, created_at: now } });
      await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: student.$id, transactionId: transaction.$id, data: { rank_key: participant.target_rank_key, updated_at: now } });
    }
    await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participant.$id, transactionId: transaction.$id, data: { status: input.result, result_notes: input.notes, graded_at: now, updated_at: now } });
    if (openParticipants.total === 1) await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examEvents, rowId: event.$id, transactionId: transaction.$id, data: { status: "completed", updated_at: now } });
    await tables.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) {
    await tables.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw error;
  }
  invalidateTags(
    CACHE_TAGS.examEvents,
    CACHE_TAGS.examEvent(event.$id),
    CACHE_TAGS.exams(student.$id),
    CACHE_TAGS.student(student.$id),
    CACHE_TAGS.studentsAll,
    CACHE_TAGS.enrollments
  );
  await writeAuditEvent("exam.result.recorded", actor.account_id, "exam_participant", participant.$id, { result: input.result, target_rank_key: participant.target_rank_key });
  const targetName = beltNameOf(ranks.map(toPublicRank), participant.target_rank_key);
  const resultTitle =
    input.result === "approved"
      ? `Parabéns! Aprovado para Faixa ${targetName}`
      : `Resultado disponível: ${event.name}`;
  const resultBody =
    input.result === "approved"
      ? `O professor registrou sua aprovação no exame ${event.name} para a Faixa ${targetName}.${input.notes ? ` Observação: ${input.notes}` : ""}`
      : input.result === "absent"
        ? `Sua presença não foi registrada no exame ${event.name}.${input.notes ? ` Observação: ${input.notes}` : ""}`
        : `O professor publicou o resultado do exame ${event.name}. Confira os detalhes no aplicativo.${input.notes ? ` Observação: ${input.notes}` : ""}`;
  await notifyStudentEvent({
    studentId: student.$id,
    audience: "family",
    title: resultTitle,
    body: resultBody,
    dedupeKey: `exam-result:${participant.$id}:${input.result}`,
    studentActionUrl: ROUTES.studentExams,
    guardianActionUrl: guardianExamsPath,
    actorAccountId: actor.account_id
  }).catch(() => undefined);
  return tables.getRow<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, rowId: participant.$id });
}
