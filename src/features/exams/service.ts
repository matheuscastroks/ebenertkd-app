import "server-only";

import { createHash } from "node:crypto";
import { AppwriteException, ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { cancelUnpaidExamCharge, createExamCharge } from "@/features/billing/charge-service";
import type { Charge } from "@/features/billing/types";
import { beltNameOf, findRank, toPublicRank } from "@/features/academy/belt-rules";
import { getBeltRanks, getPolicy } from "@/features/academy/config-service";
import { isRankKey, rankShortLabel } from "@/features/academy/ranks";
import { assertNextGraduation, assertPromotion, examChargeCancellation, examFeeCents, type PaidChargeDecision } from "@/features/exams/rules";
import type { Event } from "@/features/events/types";
import { examEventSchema, examParticipantSchema, examResultSchema } from "@/features/exams/schemas";
import { toExamEvent, type BeltHistory, type ExamEvent, type ExamParticipant } from "@/features/exams/types";
import { notifyStudentEvent } from "@/features/notifications/notification-service";
import { getStudentPreviews } from "@/features/students/people-preview";
import type { PersonPreview } from "@/features/students/photo-url";
import { badgeForExamApproval } from "@/features/students/badge-rules";
import { awardBadges } from "@/features/students/badge-service";
import type { Enrollment, Student, StudentDocument } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { formatBusinessDateBr } from "@/lib/dates";
import { guardianExamsPath, ROUTES } from "@/lib/navigation/routes";

const dateTime = (date: string) => `${date}T12:00:00.000Z`;
/** Lê a linha de `events` e garante que é uma banca de exame. */
async function getExamEventRow(tables: ReturnType<typeof createAppwriteAdminClient>["tables"], databaseId: string, eventId: string) {
  const row = await tables.getRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId });
  if (row.event_type !== "belt_exam") throw new Error("event_not_found");
  return row;
}

const stableId = (...parts: string[]) => createHash("sha256").update(parts.join(":" )).digest("hex").slice(0, 36);

export async function createExamEvent(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = examEventSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const now = new Date().toISOString();
  const event = await tables.createRow<Event>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: ID.unique(), permissions: [], data: { event_type: "belt_exam", title: input.name, status: "registration_open", starts_at: dateTime(input.eventDate), location_text: input.location, organizer_type: "academy", audience: "students", requires_approval: false, age_cutoff: "birth_year", exam_fee_cents: input.defaultFeeCents, created_by_account_id: actor.account_id, created_at: now, updated_at: now } });
  invalidateTags(CACHE_TAGS.events, CACHE_TAGS.event(event.$id));
  await writeAuditEvent("event.created", actor.account_id, "event", event.$id, { event_type: "belt_exam", starts_on: input.eventDate });
  return toExamEvent(event);
}

export function listExamEvents() {
  return cachedRead(
    { name: "list-exam-events", key: [], tags: [CACHE_TAGS.events], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      return (await tables.listRows<Event>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, queries: [Query.equal("event_type", ["belt_exam"]), Query.orderDesc("starts_at"), Query.limit(100)] })).rows.map(toExamEvent);
    }
  );
}

export type ExamEventWithStats = ExamEvent & {
  participantCount: number;
  totalFeesCents: number;
  /** Amostra de candidatos para o grupo de avatares do cartão. */
  candidates: PersonPreview[];
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
    { name: "get-exams-overview", key: [], tags: [CACHE_TAGS.events], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const [eventsResult, participantsResult] = await Promise.all([
        tables.listRows<Event>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.events,
          queries: [Query.equal("event_type", ["belt_exam"]), Query.orderDesc("starts_at"), Query.limit(100)],
        }),
        tables.listRows<ExamParticipant>({
          databaseId: config.databaseId,
          tableId: APPWRITE_IDS.tables.examParticipants,
          queries: [Query.limit(5000)],
        }),
      ]);

      const events = eventsResult.rows.map(toExamEvent);
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

      const previews = await getStudentPreviews(
        [...participantsByEvent.values()].flatMap((list) => list.slice(0, 6).map((participant) => participant.student_id))
      );
      const eventsWithStats: ExamEventWithStats[] = events.map((event) => {
        const eventParticipants = participantsByEvent.get(event.$id) ?? [];
        const totalFeesCents = eventParticipants.reduce((sum, p) => sum + (p.fee_cents || 0), 0);
        return {
          ...event,
          participantCount: eventParticipants.length,
          totalFeesCents,
          candidates: eventParticipants.slice(0, 6).map((p) => previews.get(p.student_id) ?? { name: "Aluno" }),
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
    { name: "get-exam-event", key: [eventId], tags: [CACHE_TAGS.events, CACHE_TAGS.event(eventId)], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      return toExamEvent(await getExamEventRow(tables, config.databaseId, eventId));
    }
  );
}

export async function cancelExamEvent(actor: Profile, eventId: string) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  const [event, activeParticipants] = await Promise.all([
    getExamEventRow(tables, config.databaseId, eventId),
    tables.listRows<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("event_id", [eventId]), Query.equal("status", ["registered"]), Query.limit(1)] })
  ]);
  if (event.status === "cancelled") return toExamEvent(event);
  if (event.status === "completed") throw new Error("exam_event_completed");
  if (activeParticipants.total > 0) throw new Error("exam_event_has_active_participants");
  const now = new Date().toISOString();
  const updated = await tables.updateRow<Event>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId, data: { status: "cancelled", cancelled_at: now, updated_at: now } });
  invalidateTags(CACHE_TAGS.events, CACHE_TAGS.event(eventId));
  await writeAuditEvent("event.cancelled", actor.account_id, "event", eventId, { event_type: "belt_exam" });
  return toExamEvent(updated);
}

export function getExamEventBundle(eventId: string) {
  return cachedRead(
    { name: "get-exam-event-bundle", key: [eventId], tags: [CACHE_TAGS.events, CACHE_TAGS.event(eventId), CACHE_TAGS.billingCharges, CACHE_TAGS.enrollments, CACHE_TAGS.studentsAll], revalidate: 60 },
    async () => {
      const { tables, config } = createAppwriteAdminClient();
      const event = toExamEvent(await getExamEventRow(tables, config.databaseId, eventId));
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
  const [ranks, beltPolicy, examPolicy, event, student, enrollments] = await Promise.all([
    getBeltRanks(),
    getPolicy("belts"),
    getPolicy("exam"),
    getExamEventRow(tables, config.databaseId, input.eventId).then(toExamEvent),
    tables.getRow<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: input.studentId }),
    tables.listRows<Enrollment>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [input.studentId]), Query.equal("status", ["active"]), Query.limit(1)] })
  ]);
  const levelLabel = beltPolicy.level_label;
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
  // Banca montada: com inscritos a data está confirmada (`registration_closed` = "confirmed" na visão de exame).
  if (event.status === "planned") await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: event.$id, data: { status: "registration_closed", updated_at: now } });
  invalidateTags(CACHE_TAGS.events, CACHE_TAGS.event(event.$id), CACHE_TAGS.exams(student.$id), CACHE_TAGS.billingCharges, CACHE_TAGS.charges(student.$id));
  await writeAuditEvent("exam.participant.added", actor.account_id, "exam_participant", participant.$id, { charge_id: charge.$id });
  await notifyStudentEvent({
    studentId: student.$id,
    audience: "family",
    title: "Inscrito no exame",
    body: `${student.full_name} · ${isRankKey(participant.target_rank_key) ? rankShortLabel(participant.target_rank_key, levelLabel) : participant.target_rank_key} em ${formatBusinessDateBr(event.event_date)}.`,
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
  invalidateTags(CACHE_TAGS.events, CACHE_TAGS.event(participant.event_id), CACHE_TAGS.exams(participant.student_id), CACHE_TAGS.billingCharges, CACHE_TAGS.charges(participant.student_id));
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
  const [ranks, beltPolicy, student, event, openParticipants] = await Promise.all([
    getBeltRanks(),
    getPolicy("belts"),
    tables.getRow<Student>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.students, rowId: participant.student_id }),
    getExamEventRow(tables, config.databaseId, participant.event_id).then(toExamEvent),
    tables.listRows<ExamParticipant>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("event_id", [participant.event_id]), Query.equal("status", ["registered"]), Query.limit(500)] })
  ]);
  const levelLabel = beltPolicy.level_label;
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
    if (openParticipants.total === 1) await tables.updateRow({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: event.$id, transactionId: transaction.$id, data: { status: "completed", updated_at: now } });
    await tables.updateTransaction({ transactionId: transaction.$id, commit: true });
  } catch (error) {
    await tables.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
    throw error;
  }
  invalidateTags(
    CACHE_TAGS.events,
    CACHE_TAGS.event(event.$id),
    CACHE_TAGS.exams(student.$id),
    CACHE_TAGS.student(student.$id),
    CACHE_TAGS.studentsAll,
    CACHE_TAGS.enrollments
  );
  await writeAuditEvent("exam.result.recorded", actor.account_id, "exam_participant", participant.$id, { result: input.result, target_rank_key: participant.target_rank_key });
  const targetLabel = isRankKey(participant.target_rank_key)
    ? rankShortLabel(participant.target_rank_key, levelLabel)
    : beltNameOf(ranks.map(toPublicRank), participant.target_rank_key);
  if (input.result === "approved") await awardBadges([badgeForExamApproval({ studentId: student.$id, participantId: participant.$id, eventId: event.$id, beltName: targetLabel })]);
  const resultTitle =
    input.result === "approved"
      ? `Aprovado para ${targetLabel}`
      : `Resultado do exame · ${event.name}`;
  const resultBody =
    input.result === "approved"
      ? `Aprovação confirmada em ${event.name}.${input.notes ? ` Obs.: ${input.notes}` : ""}`
      : input.result === "absent"
        ? `Ausência registrada em ${event.name}.${input.notes ? ` Obs.: ${input.notes}` : ""}`
        : `Resultado publicado em ${event.name}.${input.notes ? ` Obs.: ${input.notes}` : ""}`;
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
