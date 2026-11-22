import "server-only";

import { createHash } from "node:crypto";
import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getBeltContext } from "@/features/academy/config-service";
import { rankShortLabel } from "@/features/academy/ranks";
import { cancelUnpaidEventCharge, createEventCharge, reopenEventCharge } from "@/features/billing/charge-service";
import type { Charge } from "@/features/billing/types";
import { formatEventDayTime } from "@/features/events/dates";
import { eligibilitySexOf } from "@/features/events/rules/category-presets";
import { evaluateEventEligibility } from "@/features/events/rules/eligibility-rules";
import { eventChargeCancellation } from "@/features/events/rules/pricing-rules";
import { parseEligibilityJson } from "@/features/events/schemas";
import type { Event, EventOption, EventRegistration } from "@/features/events/types";
import { notifyStudentEvent } from "@/features/notifications/notification-service";
import { canAccessStudent } from "@/features/students/access";
import type { Enrollment, Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { guardianEventsPath, ROUTES } from "@/lib/navigation/routes";

export type Tables = ReturnType<typeof createAppwriteAdminClient>["tables"];

export const stableId = (...parts: string[]) => createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 36);

/** Evento, opções e inscrições. Exames têm serviço próprio e nunca passam por aqui. */
export async function loadEventContext(tables: Tables, databaseId: string, eventId: string) {
  const event = await tables.getRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId }).catch(() => {
    throw new Error("event_not_found");
  });
  if (event.event_type === "belt_exam") throw new Error("event_not_found");
  const [options, registrations] = await Promise.all([
    tables.listRows<EventOption>({ databaseId, tableId: APPWRITE_IDS.tables.eventOptions, queries: [Query.equal("event_id", [eventId]), Query.limit(100)] }),
    tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [eventId]), Query.limit(5000)] })
  ]);
  return { event, options: options.rows, registrations: registrations.rows };
}

export type RegistrationNoticeKind = "confirmed" | "waitlisted" | "promoted" | "cancelled" | "pending" | "rejected" | "team_confirmed" | "submitted" | "authorized" | "result";

export function notifyRegistration(input: { studentId: string; event: Event; registrationId: string; kind: RegistrationNoticeKind; actorAccountId?: string; detail?: string }) {
  const when = formatEventDayTime(input.event.starts_at);
  const copy = {
    confirmed: ["Inscrição confirmada", `Vaga garantida em ${input.event.title}, ${when}.`],
    waitlisted: ["Você está na lista de espera", `${input.event.title} está lotado. Avisaremos se abrir uma vaga.`],
    promoted: ["Abriu uma vaga!", `Sua inscrição em ${input.event.title} foi confirmada (${when}).`],
    cancelled: ["Inscrição cancelada", `A inscrição em ${input.event.title} foi cancelada.`],
    pending: ["Inscrição recebida", `Aguardando a aprovação do professor para ${input.event.title}.`],
    rejected: ["Inscrição não aprovada", `A inscrição em ${input.event.title} não foi aprovada.`],
    team_confirmed: ["Você está na equipe!", `A academia confirmou a inscrição em ${input.event.title} (${when}). As taxas já estão em Financeiro.`],
    submitted: ["Inscrição enviada à federação", `A academia enviou sua inscrição em ${input.event.title} à federação.`],
    authorized: ["Autorização registrada", `A autorização do responsável para ${input.event.title} foi registrada. O professor confirma a equipe em seguida.`],
    result: ["Resultado do campeonato", input.detail ?? `O resultado de ${input.event.title} foi registrado.`]
  }[input.kind];
  return notifyStudentEvent({
    studentId: input.studentId,
    audience: "family",
    title: copy[0],
    body: copy[1],
    dedupeKey: `event-registration:${input.registrationId}:${input.kind}`,
    studentActionUrl: ROUTES.studentEvents,
    guardianActionUrl: guardianEventsPath,
    actorAccountId: input.actorAccountId
  }).catch(() => undefined);
}

/**
 * Cria (ou reabre) as cobranças `event_fee` da inscrição: custos da academia e, quando a opção tem,
 * a taxa da federação (cobrança separada). Cada uma é idempotente por inscrição + item.
 * Convidados e inscrições gratuitas não geram cobrança.
 */
export async function ensureCharge(tables: Tables, databaseId: string, registration: EventRegistration, event: Event) {
  if (!registration.student_id || !registration.enrollment_id) return registration;
  const academyCents = registration.price_cents;
  const federationCents = registration.federation_price_cents ?? 0;
  if (academyCents <= 0 && federationCents <= 0) return registration;
  const enrollment = await tables.getRow<Enrollment>({ databaseId, tableId: APPWRITE_IDS.tables.enrollments, rowId: registration.enrollment_id });
  const data: Partial<Pick<EventRegistration, "charge_id" | "federation_charge_id">> & { updated_at?: string } = {};
  for (const [item, amountCents] of [["academy", academyCents], ["federation", federationCents]] as const) {
    if (amountCents <= 0) continue;
    let charge = await createEventCharge({ enrollment, registrationId: registration.$id, item, eventTitle: event.title, eventDate: event.starts_at, amountCents });
    if (charge.status === "cancelled") charge = await reopenEventCharge(charge, amountCents);
    if (item === "academy" && registration.charge_id !== charge.$id) data.charge_id = charge.$id;
    if (item === "federation" && registration.federation_charge_id !== charge.$id) data.federation_charge_id = charge.$id;
  }
  if (!Object.keys(data).length) return registration;
  return tables.updateRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registration.$id, data: { ...data, updated_at: new Date().toISOString() } });
}

/**
 * Cancela ou recusa: cobranças em aberto são canceladas; pagas exigem a decisão (crédito futuro ou manter)
 * e, para aluno/responsável, o professor precisa decidir. Devolve a decisão que ficou registrada.
 */
export async function settleRegistrationCharges(tables: Tables, databaseId: string, registration: EventRegistration, input: { decision?: "future_credit" | "keep_charge"; isAdmin: boolean; reason: string }) {
  const ids = [registration.charge_id, registration.federation_charge_id].filter((id): id is string => Boolean(id));
  if (!ids.length) return undefined;
  const charges = await Promise.all(ids.map((rowId) => tables.getRow<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, rowId })));
  if (!input.isAdmin && charges.some((charge) => !["pending", "overdue", "cancelled"].includes(charge.status))) throw new Error("event_paid_charge_decision_required");
  const handlings = charges.map((charge) => eventChargeCancellation(charge.status, input.decision));
  for (const [index, charge] of charges.entries()) {
    if (handlings[index] === "cancel") await cancelUnpaidEventCharge(charge, input.reason);
  }
  return handlings.includes("preserve") ? input.decision : undefined;
}

export type Access = { registration: EventRegistration; event: Event; options: EventOption[]; student?: Student; isAdmin: boolean };

/** Carrega a inscrição e garante que o ator pode agir sobre ela (própria, de dependente ou admin). */
export async function loadRegistrationForActor(actor: Profile, registrationId: string): Promise<Access> {
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const registration = await tables.getRow<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, rowId: registrationId }).catch(() => {
    throw new Error("registration_not_found");
  });
  const { event, options } = await loadEventContext(tables, databaseId, registration.event_id);
  const isAdmin = actor.role === "admin";
  if (isAdmin) return { registration, event, options, isAdmin, student: registration.student_id ? await tables.getRow<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, rowId: registration.student_id }) : undefined };
  if (!registration.student_id) {
    // Convidado: só quem o inscreveu enxerga e altera.
    if (registration.registered_by_account_id !== actor.account_id) throw new Error("registration_forbidden");
    return { registration, event, options, isAdmin };
  }
  const student = await tables.getRow<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, rowId: registration.student_id });
  if (!(await canAccessStudent(actor, student.profile_id))) throw new Error("registration_forbidden");
  return { registration, event, options, student, isAdmin };
}

/** Elegibilidade atual do aluno numa opção (faixa e matrícula de hoje, sexo do cadastro e peso informado). */
export async function evaluateOptionEligibility(tables: Tables, databaseId: string, input: { student: Student; event: Event; option: EventOption; weightGrams?: number | null; hasActiveEnrollment?: boolean }) {
  const rule = parseEligibilityJson(input.option.eligibility_json);
  const overdue = rule.require_no_overdue ? (await tables.listRows<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("student_id", [input.student.$id]), Query.equal("status", ["overdue"]), Query.limit(1)] })).total > 0 : false;
  const { levelLabel } = await getBeltContext();
  return evaluateEventEligibility({
    rule,
    athlete: { rankKey: input.student.rank_key, birthDate: input.student.birth_date, sex: eligibilitySexOf(input.student.sex), weightGrams: input.weightGrams, hasActiveEnrollment: input.hasActiveEnrollment ?? true, hasOverdueCharges: overdue },
    event: { startsAt: input.event.starts_at, ageCutoff: input.event.age_cutoff },
    rankLabel: (key) => rankShortLabel(key, levelLabel)
  });
}
