import "server-only";

import { ID, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { cancelUnpaidEventCharge } from "@/features/billing/charge-service";
import type { Charge } from "@/features/billing/types";
import { saoPauloInstant } from "@/features/events/dates";
import { seatsTaken, type SeatedRegistration } from "@/features/events/rules/capacity-rules";
import { eventChargeCancellation } from "@/features/events/rules/pricing-rules";
import { assertEventTransition, holdsSeat, isActiveRegistration, isEventTerminal } from "@/features/events/rules/status-rules";
import { cancelEventSchema, eventInputSchema } from "@/features/events/schemas";
import { DEADLINE_KIND_LABEL } from "@/features/events/rules/deadline-rules";
import type { Event, EventDeadline, EventOption, EventRegistration, EventStatus, EventType } from "@/features/events/types";
import type { ExamParticipant } from "@/features/exams/types";
import { badgeForSeminarAttendance } from "@/features/students/badge-rules";
import { awardBadges } from "@/features/students/badge-service";
import { getStudentPreviews } from "@/features/students/people-preview";
import type { PersonPreview } from "@/features/students/photo-url";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";

/** Tipos tratados pelo fluxo simples de inscrição (E2). Campeonato tem fluxo próprio. */
export const SIMPLE_EVENT_TYPES: readonly EventType[] = ["seminar", "social", "other"];
/** Tipos que o aluno e o responsável veem na tela de eventos (exames têm tela própria). */
export const STUDENT_EVENT_TYPES: readonly EventType[] = [...SIMPLE_EVENT_TYPES, "championship"];

export function toSeated(registration: EventRegistration): SeatedRegistration {
  return { id: registration.$id, option_id: registration.option_id, status: registration.status, companions: registration.companions, waitlist_position: registration.waitlist_position, created_at: registration.created_at };
}

export function invalidateEventTags(eventId: string, studentId?: string | null) {
  const tags: string[] = [CACHE_TAGS.events, CACHE_TAGS.event(eventId), CACHE_TAGS.eventRegistrations(eventId)];
  if (studentId) tags.push(CACHE_TAGS.studentEvents(studentId));
  invalidateTags(...tags);
}

export async function createEvent(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = eventInputSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const now = new Date().toISOString();
  const startsAt = saoPauloInstant(input.startsDate, input.startsTime);
  const endsAt = input.endsTime ? saoPauloInstant(input.startsDate, input.endsTime) : undefined;
  const guestsAllowed = input.audience !== "students";
  const event = await tables.createRow<Event>({
    databaseId,
    tableId: APPWRITE_IDS.tables.events,
    rowId: ID.unique(),
    permissions: [],
    data: {
      event_type: input.eventType,
      title: input.title,
      description: input.description,
      status: input.publish ? "registration_open" : "draft",
      starts_at: startsAt,
      ends_at: endsAt,
      location_id: input.locationId || undefined,
      location_text: input.locationText,
      organizer_type: input.organizerType,
      organizer_name: input.organizerName,
      registration_opens_at: input.registrationOpensDate ? saoPauloInstant(input.registrationOpensDate, "00:00") : undefined,
      registration_closes_at: input.registrationClosesDate ? saoPauloInstant(input.registrationClosesDate, "23:59") : undefined,
      audience: input.audience,
      requires_approval: input.requiresApproval,
      capacity: input.capacity,
      max_companions: input.maxCompanions,
      companion_price_cents: input.maxCompanions > 0 ? input.companionPriceCents : undefined,
      age_cutoff: input.ageCutoff,
      external_url: input.externalUrl,
      created_by_account_id: actor.account_id,
      created_at: now,
      updated_at: now
    }
  });
  await Promise.all(
    input.options.map((option, index) =>
      tables.createRow<EventOption>({
        databaseId,
        tableId: APPWRITE_IDS.tables.eventOptions,
        rowId: ID.unique(),
        permissions: [],
        data: {
          event_id: event.$id,
          label: option.label,
          modality: option.modality,
          price_cents: option.priceCents,
          federation_fee_cents: option.federationFeeCents > 0 ? option.federationFeeCents : undefined,
          capacity: option.capacity,
          eligibility_json: option.eligibility && Object.keys(option.eligibility).length ? JSON.stringify(option.eligibility) : undefined,
          max_per_registrant_group: input.eventType === "championship" && option.modality === "kyorugi" ? "kyorugi" : undefined,
          sort_order: index,
          created_at: now,
          updated_at: now
        }
      })
    )
  );
  await Promise.all(
    input.deadlines.map((deadline) =>
      tables.createRow<EventDeadline>({
        databaseId,
        tableId: APPWRITE_IDS.tables.eventDeadlines,
        rowId: ID.unique(),
        permissions: [],
        data: { event_id: event.$id, kind: deadline.kind, label: deadline.label || DEADLINE_KIND_LABEL[deadline.kind], due_at: saoPauloInstant(deadline.dueDate, "23:59"), notify_days_before: deadline.notifyDaysBefore, created_at: now, updated_at: now }
      })
    )
  );
  invalidateEventTags(event.$id);
  await writeAuditEvent("event.created", actor.account_id, "event", event.$id, { event_type: input.eventType, status: event.status, guests_allowed: guestsAllowed, deadlines: input.deadlines.length });
  return event;
}

export type EventCardData = {
  event: Event;
  seatsTaken: number;
  waitlisted: number;
  pendingApproval: number;
  /** Exames: candidatos inscritos (a banca não usa lista de espera). */
  examParticipants: number;
  /** Amostra de quem se inscreveu (alunos e convidados) para o grupo de avatares. */
  people: PersonPreview[];
  /** Total de pessoas representadas pela amostra. */
  peopleTotal: number;
};

const PEOPLE_SAMPLE = 6;

/** Agenda: todos os eventos com ocupação. Aberta ao professor; alunos usam `getStudentEvents`. */
export function getEventsOverview() {
  return cachedRead(
    { name: "get-events-overview", key: [], tags: [CACHE_TAGS.events], revalidate: 60 },
    async (): Promise<EventCardData[]> => {
      const { tables, config } = createAppwriteAdminClient();
      const databaseId = config.databaseId;
      const [events, registrations, participants] = await Promise.all([
        tables.listRows<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, queries: [Query.orderDesc("starts_at"), Query.limit(200)] }),
        tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.limit(5000)] }),
        tables.listRows<ExamParticipant>({ databaseId, tableId: APPWRITE_IDS.tables.examParticipants, queries: [Query.equal("status", ["registered", "approved", "failed", "absent"]), Query.limit(5000)] })
      ]);
      const byEvent = new Map<string, EventRegistration[]>();
      for (const registration of registrations.rows) byEvent.set(registration.event_id, [...(byEvent.get(registration.event_id) ?? []), registration]);
      const examsByEvent = new Map<string, number>();
      for (const participant of participants.rows) examsByEvent.set(participant.event_id, (examsByEvent.get(participant.event_id) ?? 0) + 1);
      const examParticipantsByEvent = new Map<string, ExamParticipant[]>();
      for (const participant of participants.rows) examParticipantsByEvent.set(participant.event_id, [...(examParticipantsByEvent.get(participant.event_id) ?? []), participant]);
      // Amostra por evento: inscrições vivas (ou candidatos, nos exames), na ordem de chegada.
      const sampleByEvent = new Map<string, { studentId?: string; guestName?: string }[]>();
      for (const event of events.rows) {
        const entries =
          event.event_type === "belt_exam"
            ? (examParticipantsByEvent.get(event.$id) ?? []).map((item) => ({ studentId: item.student_id }))
            : (byEvent.get(event.$id) ?? []).filter((item) => isActiveRegistration(item.status)).map((item) => (item.student_id ? { studentId: item.student_id } : { guestName: item.guest_name ?? "Convidado" }));
        sampleByEvent.set(event.$id, entries);
      }
      const previews = await getStudentPreviews([...sampleByEvent.values()].flatMap((entries) => entries.slice(0, PEOPLE_SAMPLE).flatMap((entry) => (entry.studentId ? [entry.studentId] : []))));
      return events.rows.map((event) => {
        const list = byEvent.get(event.$id) ?? [];
        const sample = sampleByEvent.get(event.$id) ?? [];
        const people = sample.slice(0, PEOPLE_SAMPLE).map((entry): PersonPreview => (entry.studentId ? (previews.get(entry.studentId) ?? { name: "Aluno" }) : { name: entry.guestName ?? "Convidado" }));
        return {
          people,
          peopleTotal: sample.length,
          event,
          seatsTaken: seatsTaken(list.map(toSeated)),
          waitlisted: list.filter((item) => item.status === "waitlisted").length,
          pendingApproval: list.filter((item) => item.status === "pending_approval" || item.status === "interested").length,
          examParticipants: examsByEvent.get(event.$id) ?? 0
        };
      });
    }
  );
}

export type EventRegistrationRow = {
  registration: EventRegistration;
  option: EventOption | undefined;
  /** Nome exibido: aluno ou convidado. */
  name: string;
  isGuest: boolean;
  charge?: Charge;
  /** Foto autorizada do aluno (rota privada), quando houver. */
  imageUrl?: string;
};

export type EventBundle = {
  event: Event;
  options: EventOption[];
  rows: EventRegistrationRow[];
  seatsTaken: number;
};

/** Detalhe do evento para o professor (nomes, opções, cobranças). */
export function getEventBundle(eventId: string) {
  return cachedRead(
    { name: "get-event-bundle", key: [eventId], tags: [CACHE_TAGS.events, CACHE_TAGS.event(eventId), CACHE_TAGS.eventRegistrations(eventId), CACHE_TAGS.billingCharges], revalidate: 60 },
    async (): Promise<EventBundle> => {
      const { tables, config } = createAppwriteAdminClient();
      const databaseId = config.databaseId;
      const event = await tables.getRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId }).catch(() => {
        throw new Error("event_not_found");
      });
      const [options, registrations] = await Promise.all([
        tables.listRows<EventOption>({ databaseId, tableId: APPWRITE_IDS.tables.eventOptions, queries: [Query.equal("event_id", [eventId]), Query.orderAsc("sort_order"), Query.limit(100)] }),
        tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [eventId]), Query.orderAsc("$createdAt"), Query.limit(2000)] })
      ]);
      const studentIds = [...new Set(registrations.rows.flatMap((row) => (row.student_id ? [row.student_id] : [])))];
      const chargeIds = registrations.rows.flatMap((row) => (row.charge_id ? [row.charge_id] : []));
      const [students, charges, previews] = await Promise.all([
        studentIds.length ? tables.listRows<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("$id", studentIds), Query.limit(2000)] }) : { rows: [] as Student[] },
        chargeIds.length ? tables.listRows<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("$id", chargeIds), Query.limit(2000)] }) : { rows: [] as Charge[] },
        getStudentPreviews(studentIds)
      ]);
      const studentById = new Map(students.rows.map((student) => [student.$id, student]));
      const chargeById = new Map(charges.rows.map((charge) => [charge.$id, charge]));
      const optionById = new Map(options.rows.map((option) => [option.$id, option]));
      const rows: EventRegistrationRow[] = registrations.rows.map((registration) => ({
        registration,
        option: optionById.get(registration.option_id),
        name: registration.student_id ? (studentById.get(registration.student_id)?.full_name ?? "Aluno") : (registration.guest_name ?? "Convidado"),
        isGuest: !registration.student_id,
        imageUrl: registration.student_id ? previews.get(registration.student_id)?.imageUrl : undefined,
        charge: registration.charge_id ? chargeById.get(registration.charge_id) : undefined
      }));
      return { event, options: options.rows, rows, seatsTaken: seatsTaken(registrations.rows.map(toSeated)) };
    }
  );
}

/** Abertura e encerramento das inscrições, publicação e volta para rascunho. Exames têm ciclo próprio. */
export async function setEventStatus(actor: Profile, eventId: string, to: EventStatus) {
  if (actor.role !== "admin") throw new Error("admin_required");
  if (to === "cancelled" || to === "completed") throw new Error("event_invalid_transition");
  const { tables, config } = createAppwriteAdminClient();
  const event = await tables.getRow<Event>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId });
  if (event.event_type === "belt_exam") throw new Error("event_invalid_transition");
  assertEventTransition(event.status, to);
  const updated = await tables.updateRow<Event>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId, data: { status: to, updated_at: new Date().toISOString() } });
  invalidateEventTags(eventId);
  await writeAuditEvent("event.status_changed", actor.account_id, "event", eventId, { from: event.status, to });
  return updated;
}

/** Cancela o evento: cobranças em aberto são canceladas; pagas exigem a decisão financeira. */
export async function cancelEvent(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = cancelEventSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const event = await tables.getRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: input.eventId });
  if (event.event_type === "belt_exam") throw new Error("event_invalid_transition");
  if (event.status === "cancelled") return event;
  if (isEventTerminal(event.status)) throw new Error("event_terminal");
  assertEventTransition(event.status, "cancelled");
  const registrations = (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [event.$id]), Query.limit(5000)] })).rows.filter((row) => isActiveRegistration(row.status));
  const chargeIds = registrations.flatMap((row) => (row.charge_id ? [row.charge_id] : []));
  const charges = chargeIds.length ? (await tables.listRows<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("$id", chargeIds), Query.limit(5000)] })).rows : [];
  const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
  // Valida tudo antes de alterar qualquer linha.
  const plan = registrations.map((registration) => {
    const charge = registration.charge_id ? chargeById.get(registration.charge_id) : undefined;
    return { registration, charge, handling: charge ? eventChargeCancellation(charge.status, input.decision) : ("none" as const) };
  });
  const now = new Date().toISOString();
  for (const { registration, charge, handling } of plan) {
    if (charge && handling === "cancel") await cancelUnpaidEventCharge(charge, `Evento cancelado: ${event.$id}`);
    await tables.updateRow({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "cancelled", cancelled_at: now, financial_decision: handling === "preserve" ? input.decision : undefined, updated_at: now } });
  }
  const updated = await tables.updateRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: event.$id, data: { status: "cancelled", cancelled_at: now, cancellation_reason: input.reason, updated_at: now } });
  invalidateTags(CACHE_TAGS.events, CACHE_TAGS.event(event.$id), CACHE_TAGS.eventRegistrations(event.$id), CACHE_TAGS.billingCharges);
  for (const { registration } of plan) if (registration.student_id) invalidateTags(CACHE_TAGS.studentEvents(registration.student_id), CACHE_TAGS.charges(registration.student_id));
  await writeAuditEvent("event.cancelled", actor.account_id, "event", event.$id, { event_type: event.event_type, registrations: plan.length, decision: input.decision ?? null });
  return updated;
}

/** Encerra o evento: presentes concluem, ausentes viram `no_show` e o contato dos convidados é apagado. */
export async function completeEvent(actor: Profile, eventId: string) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const event = await tables.getRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId });
  if (event.event_type === "belt_exam") throw new Error("event_invalid_transition");
  if (event.status === "completed") return event;
  assertEventTransition(event.status, "completed");
  const registrations = (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [eventId]), Query.limit(5000)] })).rows;
  const now = new Date().toISOString();
  for (const registration of registrations) {
    if (!holdsSeat(registration.status) && registration.status !== "waitlisted" && registration.status !== "interested") continue;
    const next = registration.status === "checked_in" ? "completed" : registration.status === "confirmed" ? (event.event_type === "championship" ? "completed" : "no_show") : registration.status === "completed" ? "completed" : "cancelled";
    await tables.updateRow({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: next, guest_contact: registration.student_id ? undefined : null, updated_at: now } });
  }
  const updated = await tables.updateRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId, data: { status: "completed", updated_at: now } });
  invalidateTags(CACHE_TAGS.events, CACHE_TAGS.event(eventId), CACHE_TAGS.eventRegistrations(eventId));
  for (const registration of registrations) if (registration.student_id) invalidateTags(CACHE_TAGS.studentEvents(registration.student_id));
  if (event.event_type === "seminar") {
    // Presença em aulão/seminário vira conquista (idempotente por inscrição).
    await awardBadges(registrations.filter((registration) => registration.student_id && registration.status === "checked_in").map((registration) => badgeForSeminarAttendance({ studentId: registration.student_id!, registrationId: registration.$id, eventId: event.$id, eventTitle: event.title })));
  }
  await writeAuditEvent("event.completed", actor.account_id, "event", eventId, { registrations: registrations.length });
  return updated;
}
