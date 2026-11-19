import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { writeAuditEvent } from "@/features/auth/service";
import { invalidateEventTags } from "@/features/events/event-service";
import { ensureCharge, evaluateOptionEligibility, loadRegistrationForActor, notifyRegistration, stableId } from "@/features/events/registration-support";
import { isCategoryChangeLocked } from "@/features/events/rules/deadline-rules";
import { championshipReadiness } from "@/features/events/rules/readiness-rules";
import { assertRegistrationTransition, isEventTerminal } from "@/features/events/rules/status-rules";
import { eventResultSchema, federationSubmissionSchema, updateWeightSchema } from "@/features/events/schemas";
import type { EventDeadline, EventRegistration, EventRegistrationDocument, EventResult } from "@/features/events/types";
import { badgesForEventResult } from "@/features/students/badge-rules";
import { awardBadges } from "@/features/students/badge-service";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { invalidateTags } from "@/lib/cache/invalidate";
import { CACHE_TAGS } from "@/lib/cache/tags";

async function loadChampionship(actor: Profile, registrationId: string) {
  const access = await loadRegistrationForActor(actor, registrationId);
  if (access.event.event_type !== "championship") throw new Error("event_not_championship");
  if (!access.student) throw new Error("registration_not_found");
  return { ...access, student: access.student };
}

async function loadDocuments(registrationId: string) {
  const { tables, config } = createAppwriteAdminClient();
  return (await tables.listRows<EventRegistrationDocument>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, queries: [Query.equal("registration_id", [registrationId]), Query.limit(50)] })).rows;
}

async function isMinorStudent(studentProfileId: string) {
  const { tables, config } = createAppwriteAdminClient();
  const profile = await tables.getRow<Profile>({ databaseId: config.databaseId, tableId: APPWRITE_IDS.tables.profiles, rowId: studentProfileId });
  return profile.role === "minor_student";
}

/**
 * A professora confirma o atleta na equipe: reavalia a elegibilidade de hoje (faixa pode ter mudado), confere
 * autorização, termo e documentos, e cria as duas cobranças (academia e federação). `force` deixa passar
 * pendências e fica registrado na auditoria.
 */
export async function confirmChampionshipRegistration(actor: Profile, registrationId: string, options: { force?: boolean } = {}) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const { registration, event, options: eventOptions, student } = await loadChampionship(actor, registrationId);
  if (registration.status === "confirmed") return registration;
  if (isEventTerminal(event.status)) throw new Error("event_terminal");
  assertRegistrationTransition(registration.status, "confirmed");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const option = eventOptions.find((item) => item.$id === registration.option_id);
  if (!option) throw new Error("event_option_not_found");
  const [eligibility, documents, minor] = await Promise.all([
    evaluateOptionEligibility(tables, databaseId, { student, event, option, weightGrams: registration.declared_weight_grams }),
    loadDocuments(registration.$id),
    isMinorStudent(student.profile_id)
  ]);
  const readiness = championshipReadiness({ isMinor: minor, termsAcceptedAt: registration.terms_accepted_at, guardianAuthorizedAt: registration.guardian_authorized_at, documents });
  if (!options.force) {
    if (!eligibility.eligible) throw new Error("event_not_eligible");
    if (!readiness.ready) throw new Error("registration_not_ready");
  }
  const now = new Date().toISOString();
  let row = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "confirmed", waitlist_position: null, updated_at: now } });
  row = await ensureCharge(tables, databaseId, row, event);
  invalidateEventTags(event.$id, student.$id);
  invalidateTags(CACHE_TAGS.billingCharges, CACHE_TAGS.charges(student.$id));
  await writeAuditEvent("event.registration.team_confirmed", actor.account_id, "event_registration", row.$id, { event_id: event.$id, forced: Boolean(options.force && (!eligibility.eligible || !readiness.ready)) });
  await notifyRegistration({ studentId: student.$id, event, registrationId: row.$id, kind: "team_confirmed", actorAccountId: actor.account_id });
  return row;
}

/** Marca (ou desmarca) atletas confirmados como enviados à federação. Em lote: devolve o que foi feito e o que ficou de fora. */
export async function setFederationSubmission(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = federationSubmissionSchema.parse(raw);
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const done: string[] = [];
  const skipped: string[] = [];
  for (const registrationId of input.registrationIds) {
    try {
      const { registration, event, student } = await loadChampionship(actor, registrationId);
      if (registration.status !== "confirmed" && registration.status !== "checked_in") throw new Error("registration_invalid_transition");
      if (input.submitted) {
        const [documents, minor] = await Promise.all([loadDocuments(registration.$id), isMinorStudent(student.profile_id)]);
        if (!championshipReadiness({ isMinor: minor, termsAcceptedAt: registration.terms_accepted_at, guardianAuthorizedAt: registration.guardian_authorized_at, documents }).ready) throw new Error("registration_not_ready");
      }
      const alreadyDone = input.submitted ? Boolean(registration.external_submitted_at) : !registration.external_submitted_at;
      if (!alreadyDone) {
        await tables.updateRow({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { external_submitted_at: input.submitted ? new Date().toISOString() : null, updated_at: new Date().toISOString() } });
        invalidateEventTags(event.$id, student.$id);
        await writeAuditEvent(input.submitted ? "event.registration.submitted_to_federation" : "event.registration.submission_undone", actor.account_id, "event_registration", registration.$id, { event_id: event.$id });
        if (input.submitted) await notifyRegistration({ studentId: student.$id, event, registrationId: registration.$id, kind: "submitted", actorAccountId: actor.account_id });
      }
      done.push(registrationId);
    } catch {
      skipped.push(registrationId);
    }
  }
  return { done, skipped };
}

/**
 * Peso declarado: aluno adulto, responsável ou professora alteram até o prazo de troca de categoria.
 * O menor não altera. O novo peso precisa continuar dentro da categoria escolhida (a professora pode forçar).
 */
export async function updateDeclaredWeight(actor: Profile, raw: unknown) {
  const input = updateWeightSchema.parse(raw);
  if (actor.role === "minor_student") throw new Error("registration_forbidden");
  const { registration, event, options, student, isAdmin } = await loadChampionship(actor, input.registrationId);
  if (["cancelled", "rejected", "completed", "no_show"].includes(registration.status) || isEventTerminal(event.status)) throw new Error("registration_invalid_transition");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  if (!isAdmin) {
    if (registration.external_submitted_at) throw new Error("registration_already_submitted");
    const deadlines = (await tables.listRows<EventDeadline>({ databaseId, tableId: APPWRITE_IDS.tables.eventDeadlines, queries: [Query.equal("event_id", [event.$id]), Query.limit(50)] })).rows;
    if (isCategoryChangeLocked({ deadlines, eventStartsAt: event.starts_at, registrationClosesAt: event.registration_closes_at })) throw new Error("event_category_locked");
    const option = options.find((item) => item.$id === registration.option_id);
    if (option) {
      const eligibility = await evaluateOptionEligibility(tables, databaseId, { student, event, option, weightGrams: input.declaredWeightGrams });
      if (!eligibility.eligible) throw new Error("event_not_eligible");
    }
  }
  const updated = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { declared_weight_grams: input.declaredWeightGrams, updated_at: new Date().toISOString() } });
  invalidateEventTags(event.$id, student.$id);
  // O peso é dado de saúde: a auditoria registra só que mudou, nunca o valor.
  await writeAuditEvent("event.registration.weight_updated", actor.account_id, "event_registration", registration.$id, { event_id: event.$id, forced: isAdmin });
  return updated;
}

/** Resultado e medalha do atleta. Reenviar atualiza; as conquistas (participação e medalha) são idempotentes. */
export async function recordEventResult(actor: Profile, raw: unknown) {
  if (actor.role !== "admin") throw new Error("admin_required");
  const input = eventResultSchema.parse(raw);
  const { registration, event, student } = await loadChampionship(actor, input.registrationId);
  if (event.status === "draft" || event.status === "cancelled") throw new Error("event_terminal");
  if (!["confirmed", "checked_in", "completed"].includes(registration.status)) throw new Error("registration_invalid_transition");
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const now = new Date().toISOString();
  if (input.absent) {
    // Não compareceu (ex.: à pesagem): sai da equipe como `no_show`, sem resultado nem conquistas.
    if (registration.status === "completed") throw new Error("registration_invalid_transition");
    assertRegistrationTransition(registration.status, "no_show");
    const absent = await tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "no_show", updated_at: now } });
    invalidateEventTags(event.$id, student.$id);
    await writeAuditEvent("event.registration.no_show", actor.account_id, "event_registration", registration.$id, { event_id: event.$id });
    return absent;
  }
  const rowId = stableId("event-result", registration.$id);
  const data = { medal: input.medal, placement: input.placement, notes: input.notes, recorded_by_account_id: actor.account_id, recorded_at: now };
  const existing = await tables.getRow<EventResult>({ databaseId, tableId: APPWRITE_IDS.tables.eventResults, rowId }).catch(() => null);
  const result = existing
    ? await tables.updateRow<EventResult>({ databaseId, tableId: APPWRITE_IDS.tables.eventResults, rowId, data })
    : await tables.createRow<EventResult>({ databaseId, tableId: APPWRITE_IDS.tables.eventResults, rowId, permissions: [], data: { ...data, registration_id: registration.$id, event_id: event.$id, student_id: student.$id } });
  if (registration.status !== "completed") {
    await tables.updateRow({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { status: "completed", updated_at: now } });
  }
  invalidateEventTags(event.$id, student.$id);
  await awardBadges(badgesForEventResult({ studentId: student.$id, resultId: result.$id, eventId: event.$id, eventTitle: event.title, medal: input.medal }), now);
  await writeAuditEvent("event.result.recorded", actor.account_id, "event_result", result.$id, { event_id: event.$id, medal: input.medal });
  const medalCopy = { gold: "medalha de ouro", silver: "medalha de prata", bronze: "medalha de bronze", none: "participação" }[input.medal];
  await notifyRegistration({ studentId: student.$id, event, registrationId: registration.$id, kind: "result", actorAccountId: actor.account_id, detail: `Resultado de ${event.title}: ${medalCopy}${input.placement ? ` (${input.placement}º lugar)` : ""}.` });
  return result;
}
