import "server-only";

import { AppwriteException, Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { invalidateEventTags, toSeated } from "@/features/events/event-service";
import { decideSeat, nextWaitlistPosition, planDemotions, planWaitlistPromotions, seatsOf, seatsTaken } from "@/features/events/rules/capacity-rules";
import { ageClassOf, eventAge } from "@/features/events/rules/eligibility-rules";
import { registrationPriceCents } from "@/features/events/rules/pricing-rules";
import { ensureCharge, evaluateOptionEligibility, loadEventContext, loadRegistrationForActor, notifyRegistration, settleRegistrationCharges, stableId, type Tables } from "@/features/events/registration-support";
import { assertRegistrationTransition, isEventTerminal, isRegistrationOpen } from "@/features/events/rules/status-rules";
import { cancelRegistrationSchema, registrationInputSchema } from "@/features/events/schemas";
import type { Event, EventOption, EventRegistration } from "@/features/events/types";
import { resolveStudentProfile } from "@/features/students/access";
import type { Enrollment, Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";

function capacityLimits(event: Event, options: readonly EventOption[]) {
  return { eventCapacity: event.capacity, optionCapacities: Object.fromEntries(options.map((option) => [option.$id, option.capacity])) };
}

/** Aplica rebaixamentos (corrida de inscrições) e devolve a lista atualizada. */
async function reconcile(tables: Tables, databaseId: string, event: Event, options: EventOption[]) {
  const registrations = (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [event.$id]), Query.limit(5000)] })).rows;
  const demote = planDemotions(registrations.map(toSeated), capacityLimits(event, options));
  if (!demote.length) return registrations;
  let position = nextWaitlistPosition(registrations.map(toSeated));
  const now = new Date().toISOString();
  for (const id of demote) {
    await tables.updateRow({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: id, data: { status: "waitlisted", waitlist_position: position++, updated_at: now } });
  }
  return (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [event.$id]), Query.limit(5000)] })).rows;
}

/** Quando abre vaga: promove a lista de espera na ordem, cria a cobrança e avisa. */
async function promoteWaitlist(tables: Tables, databaseId: string, event: Event, options: EventOption[], actorAccountId?: string) {
  const registrations = (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [event.$id]), Query.limit(5000)] })).rows;
  const promoted = planWaitlistPromotions(registrations.map(toSeated), capacityLimits(event, options));
  const now = new Date().toISOString();
  for (const id of promoted) {
    let row = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: id, data: { status: event.requires_approval ? "pending_approval" : "confirmed", waitlist_position: null, updated_at: now } });
    row = await ensureCharge(tables, databaseId, row, event);
    invalidateEventTags(event.$id, row.student_id);
    if (row.student_id) await notifyRegistration({ studentId: row.student_id, event, registrationId: row.$id, kind: "promoted", actorAccountId });
    await writeAuditEvent("event.registration.promoted", actorAccountId, "event_registration", row.$id, { event_id: event.$id });
  }
  return promoted.length;
}

export async function registerForEvent(actor: Profile, raw: unknown) {
  const input = registrationInputSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const { event, options, registrations } = await loadEventContext(tables, databaseId, input.eventId);
  const option = options.find((item) => item.$id === input.optionId);
  if (!option) throw new Error("event_option_not_found");
  const isAdmin = actor.role === "admin";
  if (isEventTerminal(event.status)) throw new Error("event_terminal");
  if (!isAdmin && !isRegistrationOpen(event)) throw new Error("event_registration_closed");
  if (input.companions > (event.max_companions ?? 0)) throw new Error("event_companions_not_allowed");
  // Campeonato: a academia monta a equipe (interesse → confirmação → envio à federação), sem vaga reservada na hora.
  const championship = event.event_type === "championship";

  const now = new Date().toISOString();
  const price = registrationPriceCents({ optionPriceCents: option.price_cents, companions: input.companions, companionPriceCents: event.companion_price_cents });
  const seatsWanted = 1 + input.companions;
  const base = {
    event_id: event.$id,
    option_id: option.$id,
    registered_by_account_id: actor.account_id,
    companions: input.companions,
    price_cents: price,
    notes: input.notes,
    created_at: now,
    updated_at: now
  };

  // --- Convidado sem conta: só nome e WhatsApp; cobrança é combinada pessoalmente.
  if (!input.studentProfileId) {
    if (actor.role === "minor_student") throw new Error("guardian_required");
    if (event.audience === "students" || championship) throw new Error("event_guests_not_allowed");
    const status = decideSeat({ eventCapacity: event.capacity, eventTaken: seatsTaken(registrations.map(toSeated)), optionCapacity: option.capacity, optionTaken: seatsTaken(registrations.map(toSeated), option.$id), seatsWanted, requiresApproval: event.requires_approval || !isAdmin });
    const created = await tables.createRow<EventRegistration>({
      databaseId,
      tableId: APPWRITE_IDS.tables.eventRegistrations,
      rowId: stableId("guest", event.$id, option.$id, actor.account_id, (input.guestName ?? "").toLowerCase(), (input.guestContact ?? "").replace(/\D/g, "")),
      permissions: [],
      data: { ...base, guest_name: input.guestName, guest_contact: input.guestContact?.replace(/\D/g, ""), status, waitlist_position: status === "waitlisted" ? nextWaitlistPosition(registrations.map(toSeated)) : undefined, terms_accepted_at: input.acceptedTerms || isAdmin ? now : undefined }
    }).catch(async (error) => {
      if (error instanceof AppwriteException && error.code === 409) throw new Error("registration_exists");
      throw error;
    });
    await reconcile(tables, databaseId, event, options);
    invalidateEventTags(event.$id);
    await writeAuditEvent("event.registration.created", actor.account_id, "event_registration", created.$id, { event_id: event.$id, guest: true, status });
    return created;
  }

  // --- Aluno: o próprio, um dependente (responsável) ou qualquer aluno (professor).
  const profile = await resolveStudentProfile(actor, input.studentProfileId);
  const studentRows = await tables.listRows<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)] });
  const student = studentRows.rows[0];
  if (!student) throw new Error("active_enrollment_required");
  const enrollment = (await tables.listRows<Enrollment>({ databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [student.$id]), Query.equal("status", ["active"]), Query.limit(1)] })).rows[0];
  if (!enrollment) throw new Error("active_enrollment_required");
  if (!isAdmin && !input.acceptedTerms && actor.role !== "minor_student") throw new Error("event_terms_required");

  const eligibility = await evaluateOptionEligibility(tables, databaseId, { student, event, option, weightGrams: input.declaredWeightGrams });
  if (!isAdmin && !eligibility.eligible) throw new Error("event_not_eligible");
  if (championship) {
    // Uma categoria por modalidade (ex.: um peso no kyorugi), exceto a professora.
    const group = option.max_per_registrant_group;
    const optionGroup = new Map(options.map((item) => [item.$id, item.max_per_registrant_group]));
    const sameGroup = group && registrations.some((item) => item.student_id === student.$id && item.option_id !== option.$id && ["interested", "pending_approval", "confirmed", "checked_in", "completed"].includes(item.status) && optionGroup.get(item.option_id) === group);
    if (!isAdmin && sameGroup) throw new Error("event_category_limit");
  }

  const asMinor = profile.role === "minor_student";
  const minorSelf = asMinor && actor.$id === profile.$id;
  const guardianActing = asMinor && !minorSelf && actor.role !== "admin";
  const age = eventAge(student.birth_date, event.starts_at, event.age_cutoff);

  const existing = registrations.find((item) => item.option_id === option.$id && item.student_id === student.$id);
  if (existing && existing.status !== "cancelled") return existing;

  const others = registrations.filter((item) => item.$id !== existing?.$id);
  const status = minorSelf || championship
    ? ("interested" as const)
    : decideSeat({ eventCapacity: event.capacity, eventTaken: seatsTaken(others.map(toSeated)), optionCapacity: option.capacity, optionTaken: seatsTaken(others.map(toSeated), option.$id), seatsWanted, requiresApproval: event.requires_approval });
  const data = {
    ...base,
    student_id: student.$id,
    enrollment_id: enrollment.$id,
    status,
    waitlist_position: status === "waitlisted" ? nextWaitlistPosition(others.map(toSeated)) : null,
    rank_key_snapshot: student.rank_key ?? undefined,
    age_class_snapshot: ageClassOf(age)?.label,
    declared_weight_grams: input.declaredWeightGrams,
    federation_price_cents: championship ? (option.federation_fee_cents ?? 0) : undefined,
    terms_accepted_at: input.acceptedTerms ? now : undefined,
    guardian_authorized_at: guardianActing ? now : undefined,
    guardian_account_id: guardianActing ? actor.account_id : undefined,
    cancelled_at: null,
    financial_decision: null
  };
  let row: EventRegistration;
  if (existing) {
    row = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: existing.$id, data });
  } else {
    try {
      row = await tables.createRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: stableId("registration", event.$id, option.$id, student.$id), permissions: [], data });
    } catch (error) {
      if (!(error instanceof AppwriteException) || error.code !== 409) throw error;
      // Dois cliques ao mesmo tempo: devolve a inscrição já criada (idempotente).
      return tables.getRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: stableId("registration", event.$id, option.$id, student.$id) });
    }
  }
  // Reconcilia a corrida antes de cobrar: quem estourou a capacidade volta para a espera.
  const after = await reconcile(tables, databaseId, event, options);
  row = after.find((item) => item.$id === row.$id) ?? row;
  if (row.status === "confirmed" || row.status === "pending_approval") row = await ensureCharge(tables, databaseId, row, event);
  invalidateEventTags(event.$id, student.$id);
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(student.$id));
  await writeAuditEvent("event.registration.created", actor.account_id, "event_registration", row.$id, { event_id: event.$id, status: row.status, forced: isAdmin && !isRegistrationOpen(event) });
  const kind = row.status === "waitlisted" ? "waitlisted" : row.status === "pending_approval" || row.status === "interested" ? "pending" : "confirmed";
  await notifyRegistration({ studentId: student.$id, event, registrationId: row.$id, kind, actorAccountId: actor.account_id });
  return row;
}

/** Responsável (ou professor) confirma o interesse manifestado pelo menor: reserva vaga, aceita termos e cobra. */
export async function confirmInterest(actor: Profile, registrationId: string) {
  if (actor.role === "minor_student") throw new Error("guardian_required");
  const { registration, event, options, student, isAdmin } = await loadRegistrationForActor(actor, registrationId);
  if (registration.status !== "interested") throw new Error("registration_invalid_transition");
  if (isEventTerminal(event.status)) throw new Error("event_terminal");
  if (!isAdmin && !isRegistrationOpen(event)) throw new Error("event_registration_closed");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  if (event.event_type === "championship") {
    // Campeonato: o responsável só autoriza; quem confirma a equipe e cobra é a professora.
    if (isAdmin) throw new Error("registration_invalid_transition");
    const now = new Date().toISOString();
    const row = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { terms_accepted_at: now, guardian_authorized_at: now, guardian_account_id: actor.account_id, updated_at: now } });
    invalidateEventTags(event.$id, student?.$id);
    await writeAuditEvent("event.registration.guardian_authorized", actor.account_id, "event_registration", row.$id, { event_id: event.$id });
    if (student) await notifyRegistration({ studentId: student.$id, event, registrationId: row.$id, kind: "authorized", actorAccountId: actor.account_id });
    return row;
  }
  const all = (await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [event.$id]), Query.limit(5000)] })).rows;
  const others = all.filter((item) => item.$id !== registration.$id).map(toSeated);
  const status = decideSeat({ eventCapacity: event.capacity, eventTaken: seatsTaken(others), optionCapacity: options.find((o) => o.$id === registration.option_id)?.capacity, optionTaken: seatsTaken(others, registration.option_id), seatsWanted: seatsOf(registration), requiresApproval: event.requires_approval });
  const now = new Date().toISOString();
  let row = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status, waitlist_position: status === "waitlisted" ? nextWaitlistPosition(others) : null, terms_accepted_at: now, guardian_authorized_at: isAdmin ? undefined : now, guardian_account_id: isAdmin ? undefined : actor.account_id, updated_at: now } });
  const after = await reconcile(tables, databaseId, event, options);
  row = after.find((item) => item.$id === row.$id) ?? row;
  if (row.status === "confirmed" || row.status === "pending_approval") row = await ensureCharge(tables, databaseId, row, event);
  invalidateEventTags(event.$id, student?.$id);
  invalidateTags(CACHE_TAGS.billingCharges);
  await writeAuditEvent("event.registration.interest_confirmed", actor.account_id, "event_registration", row.$id, { event_id: event.$id, status: row.status });
  if (student) await notifyRegistration({ studentId: student.$id, event, registrationId: row.$id, kind: row.status === "waitlisted" ? "waitlisted" : "confirmed", actorAccountId: actor.account_id });
  return row;
}

/** Cancela a inscrição. Aluno/responsável: antes do encerramento das inscrições e só se não houver pagamento. */
export async function cancelRegistration(actor: Profile, raw: unknown) {
  const input = cancelRegistrationSchema.parse(raw);
  const { registration, event, options, student, isAdmin } = await loadRegistrationForActor(actor, input.registrationId);
  if (registration.status === "cancelled") return registration;
  if (actor.role === "minor_student" && registration.status !== "interested") throw new Error("registration_forbidden");
  if (!isAdmin) {
    if (isEventTerminal(event.status) || !isRegistrationOpen(event)) throw new Error("event_registration_closed");
  }
  assertRegistrationTransition(registration.status, "cancelled");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const decision = await settleRegistrationCharges(tables, databaseId, registration, { decision: input.decision, isAdmin, reason: `Inscrição cancelada: ${registration.$id}` });
  const now = new Date().toISOString();
  const updated = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "cancelled", waitlist_position: null, cancelled_at: now, financial_decision: decision, updated_at: now } });
  invalidateEventTags(event.$id, student?.$id);
  invalidateTags(CACHE_TAGS.billingCharges);
  if (student) invalidateTags(CACHE_TAGS.charges(student.$id));
  await writeAuditEvent("event.registration.cancelled", actor.account_id, "event_registration", registration.$id, { event_id: event.$id, financial_decision: decision ?? null });
  if (student) await notifyRegistration({ studentId: student.$id, event, registrationId: registration.$id, kind: "cancelled", actorAccountId: actor.account_id });
  await promoteWaitlist(tables, databaseId, event, options, actor.account_id);
  return updated;
}

/** Professor aprova uma inscrição pendente. */
export async function approveRegistration(actor: Profile, registrationId: string) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { registration, event, student } = await loadRegistrationForActor(actor, registrationId);
  if (registration.status === "confirmed") return registration;
  // Só a aprovação de quem já tem vaga reservada; lista de espera e interesse seguem as próprias regras.
  if (registration.status !== "pending_approval") throw new Error("registration_invalid_transition");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  let row = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "confirmed", updated_at: new Date().toISOString() } });
  row = await ensureCharge(tables, databaseId, row, event);
  invalidateEventTags(event.$id, student?.$id);
  invalidateTags(CACHE_TAGS.billingCharges);
  await writeAuditEvent("event.registration.approved", actor.account_id, "event_registration", row.$id, { event_id: event.$id });
  if (student) await notifyRegistration({ studentId: student.$id, event, registrationId: row.$id, kind: "confirmed", actorAccountId: actor.account_id });
  return row;
}

/** Professor recusa uma inscrição (cobrança em aberto é cancelada; paga exige decisão). */
export async function rejectRegistration(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = cancelRegistrationSchema.parse(raw);
  const { registration, event, options, student } = await loadRegistrationForActor(actor, input.registrationId);
  if (registration.status === "rejected") return registration;
  assertRegistrationTransition(registration.status, "rejected");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const decision = await settleRegistrationCharges(tables, databaseId, registration, { decision: input.decision, isAdmin: true, reason: `Inscrição recusada: ${registration.$id}` });
  const now = new Date().toISOString();
  const updated = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "rejected", waitlist_position: null, financial_decision: decision, updated_at: now } });
  invalidateEventTags(event.$id, student?.$id);
  invalidateTags(CACHE_TAGS.billingCharges);
  await writeAuditEvent("event.registration.rejected", actor.account_id, "event_registration", registration.$id, { event_id: event.$id });
  if (student) await notifyRegistration({ studentId: student.$id, event, registrationId: registration.$id, kind: "rejected", actorAccountId: actor.account_id });
  await promoteWaitlist(tables, databaseId, event, options, actor.account_id);
  return updated;
}

/** Check-in no dia do evento (ou desfazer). */
export async function setCheckIn(actor: Profile, registrationId: string, present: boolean) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { registration, event, student } = await loadRegistrationForActor(actor, registrationId);
  if (isEventTerminal(event.status)) throw new Error("event_terminal");
  const target = present ? "checked_in" : "confirmed";
  if (registration.status === target) return registration;
  assertRegistrationTransition(registration.status, target);
  const { tables, config } = createAppwriteAdminClient();
  const updated = await tables.updateRow<EventRegistration>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: target, checked_in_at: present ? new Date().toISOString() : null, updated_at: new Date().toISOString() } });
  invalidateEventTags(event.$id, student?.$id);
  await writeAuditEvent(present ? "event.registration.checked_in" : "event.registration.check_in_undone", actor.account_id, "event_registration", registration.$id, { event_id: event.$id });
  return updated;
}
