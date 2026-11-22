import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { getBeltContext } from "@/features/academy/config-service";
import { rankShortLabel } from "@/features/academy/ranks";
import type { Charge } from "@/features/billing/types";
import { STUDENT_EVENT_TYPES, toSeated } from "@/features/events/event-service";
import { eligibilitySexOf } from "@/features/events/rules/category-presets";
import { isCategoryChangeLocked } from "@/features/events/rules/deadline-rules";
import { seatsTaken } from "@/features/events/rules/capacity-rules";
import { evaluateEventEligibility } from "@/features/events/rules/eligibility-rules";
import { effectiveRegistrationState, holdsSeat, isEventTerminal } from "@/features/events/rules/status-rules";
import { parseEligibilityJson } from "@/features/events/schemas";
import type { Event, EventDeadline, EventOption, EventRegistration, EventRegistrationDocument, EventResult } from "@/features/events/types";
import { resolveStudentProfile } from "@/features/students/access";
import { getStudentPreviews } from "@/features/students/people-preview";
import type { PersonPreview } from "@/features/students/photo-url";
import type { Enrollment, Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";

export type StudentEventOption = {
  option: EventOption;
  eligible: boolean;
  reasons: string[];
  /** Vagas restantes (null = sem limite). */
  seatsLeft: number | null;
  /** Inscrição deste aluno nesta opção (se houver e ativa). */
  mine?: EventRegistration;
  /** Faixa de peso da categoria (campeonato): o peso declarado decide a categoria sugerida. */
  weightRange?: { minGrams?: number; maxGrams?: number };
};

export type StudentOpenEvent = {
  event: Event;
  registrationState: "not_open" | "open" | "closed";
  options: StudentEventOption[];
  seatsLeft: number | null;
  /** Alunos únicos com inscrição que reserva vaga. */
  attendeeCount?: number;
  attendees?: PersonPreview[];
  /** Cronograma da federação (campeonato). */
  deadlines?: EventDeadline[];
  /** Cadastro sem sexo informado: o aluno precisa completar antes de competir. */
  sexMissing?: boolean;
};

export type StudentEventEntry = {
  registration: EventRegistration;
  event: Event;
  option?: EventOption;
  charge?: Charge | null;
  /** Taxa da federação (campeonato), cobrada à parte. */
  federationCharge?: Charge | null;
  documents?: EventRegistrationDocument[];
  result?: EventResult | null;
  /** Peso e categoria não podem mais mudar (prazo de troca de categoria vencido ou já enviado). */
  weightLocked?: boolean;
};

/**
 * Eventos vistos por alunos e responsáveis, com prévia dos alunos inscritos.
 * Dados de inscrição de terceiros e convidados não são enviados. Menores não recebem valores.
 */
export async function getStudentEvents(actor: Profile, requestedProfileId?: string | null) {
  const profile = await resolveStudentProfile(actor, requestedProfileId);
  const showFinancial = actor.role !== "minor_student";
  const { tables, config } = createAppwriteAdminClient();
  const databaseId = config.databaseId;
  const empty = { profile, student: null as Student | null, showFinancial, minorSelf: profile.role === "minor_student" && actor.$id === profile.$id, open: [] as StudentOpenEvent[], upcoming: [] as StudentEventEntry[], past: [] as StudentEventEntry[] };

  const student = (await tables.listRows<Student>({ databaseId, tableId: APPWRITE_IDS.tables.students, queries: [Query.equal("profile_id", [profile.$id]), Query.limit(1)] })).rows[0];
  if (!student) return empty;
  const hasEnrollment = (await tables.listRows<Enrollment>({ databaseId, tableId: APPWRITE_IDS.tables.enrollments, queries: [Query.equal("student_id", [student.$id]), Query.equal("status", ["active"]), Query.limit(1)] })).total > 0;

  const [events, beltContext] = await Promise.all([
    tables.listRows<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, queries: [Query.equal("event_type", [...STUDENT_EVENT_TYPES]), Query.orderAsc("starts_at"), Query.limit(200)] }),
    getBeltContext()
  ]);
  const visible = events.rows.filter((event) => event.status !== "draft");
  const eventIds = visible.map((event) => event.$id);
  if (!eventIds.length) return { ...empty, student };
  const [options, registrations, deadlines] = await Promise.all([
    tables.listRows<EventOption>({ databaseId, tableId: APPWRITE_IDS.tables.eventOptions, queries: [Query.equal("event_id", eventIds), Query.limit(2000)] }),
    tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", eventIds), Query.limit(5000)] }),
    tables.listRows<EventDeadline>({ databaseId, tableId: APPWRITE_IDS.tables.eventDeadlines, queries: [Query.equal("event_id", eventIds), Query.orderAsc("due_at"), Query.limit(1000)] })
  ]);
  const optionsByEvent = new Map<string, EventOption[]>();
  for (const option of options.rows) optionsByEvent.set(option.event_id, [...(optionsByEvent.get(option.event_id) ?? []), option]);
  const registrationsByEvent = new Map<string, EventRegistration[]>();
  for (const registration of registrations.rows) registrationsByEvent.set(registration.event_id, [...(registrationsByEvent.get(registration.event_id) ?? []), registration]);

  const mine = registrations.rows.filter((registration) => registration.student_id === student.$id);
  const chargeIds = showFinancial ? mine.flatMap((registration) => [registration.charge_id, registration.federation_charge_id].filter((id): id is string => Boolean(id))) : [];
  const mineIds = mine.map((registration) => registration.$id);
  const [documents, results] = mineIds.length
    ? await Promise.all([
        tables.listRows<EventRegistrationDocument>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, queries: [Query.equal("registration_id", mineIds), Query.limit(500)] }),
        tables.listRows<EventResult>({ databaseId, tableId: APPWRITE_IDS.tables.eventResults, queries: [Query.equal("registration_id", mineIds), Query.limit(500)] })
      ])
    : [{ rows: [] as EventRegistrationDocument[] }, { rows: [] as EventResult[] }];
  const charges = chargeIds.length ? (await tables.listRows<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("$id", chargeIds), Query.limit(500)] })).rows : [];
  const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
  const eventById = new Map(visible.map((event) => [event.$id, event]));
  const optionById = new Map(options.rows.map((option) => [option.$id, option]));
  const deadlinesByEvent = new Map<string, EventDeadline[]>();
  for (const deadline of deadlines.rows) deadlinesByEvent.set(deadline.event_id, [...(deadlinesByEvent.get(deadline.event_id) ?? []), deadline]);
  const resultByRegistration = new Map(results.rows.map((result) => [result.registration_id, result]));

  const attendeeIds = new Map<string, string[]>();
  for (const event of visible) {
    if (isEventTerminal(event.status) || Date.parse(event.starts_at) < Date.now()) continue;
    attendeeIds.set(event.$id, [...new Set((registrationsByEvent.get(event.$id) ?? [])
      .filter((registration) => holdsSeat(registration.status) && registration.student_id)
      .map((registration) => registration.student_id!))]);
  }
  const previews = await getStudentPreviews([...attendeeIds.values()].flatMap((ids) => ids.slice(0, 4)));

  const now = new Date();
  const open: StudentOpenEvent[] = [];
  for (const event of visible) {
    if (isEventTerminal(event.status) || Date.parse(event.starts_at) < now.getTime()) continue;
    const eventRegistrations = registrationsByEvent.get(event.$id) ?? [];
    const seated = eventRegistrations.map(toSeated);
    const taken = seatsTaken(seated);
    const state = effectiveRegistrationState(event, now);
    const optionList = (optionsByEvent.get(event.$id) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((option): StudentEventOption => {
      const rule = parseEligibilityJson(option.eligibility_json);
      const result = evaluateEventEligibility({
        rule: event.event_type === "championship" ? { ...rule, min_weight_grams: undefined, max_weight_grams: undefined } : rule,
        athlete: { rankKey: student.rank_key, birthDate: student.birth_date, sex: eligibilitySexOf(student.sex), hasActiveEnrollment: hasEnrollment, hasOverdueCharges: false },
        event: { startsAt: event.starts_at, ageCutoff: event.age_cutoff },
        rankLabel: (key) => rankShortLabel(key, beltContext.levelLabel)
      });
      const optionLeft = option.capacity == null ? null : Math.max(0, option.capacity - seatsTaken(seated, option.$id));
      const eventLeft = event.capacity == null ? null : Math.max(0, event.capacity - taken);
      return {
        option,
        eligible: result.eligible && hasEnrollment,
        reasons: hasEnrollment ? result.reasons : ["matrícula ativa necessária", ...result.reasons],
        seatsLeft: optionLeft == null ? eventLeft : eventLeft == null ? optionLeft : Math.min(optionLeft, eventLeft),
        mine: mine.find((registration) => registration.option_id === option.$id && registration.status !== "cancelled" && registration.status !== "rejected"),
        weightRange: rule.min_weight_grams !== undefined || rule.max_weight_grams !== undefined ? { minGrams: rule.min_weight_grams, maxGrams: rule.max_weight_grams } : undefined
      };
    });
    open.push({ event, registrationState: state, options: optionList, attendeeCount: (attendeeIds.get(event.$id) ?? []).length,
      attendees: (attendeeIds.get(event.$id) ?? []).slice(0, 4).map((id) => {
        const preview = previews.get(id);
        return { name: preview?.name ?? "Aluno", sex: preview?.sex,
          imageUrl: preview?.photoDocumentId ? `/api/events/${encodeURIComponent(event.$id)}/students/${encodeURIComponent(id)}/avatar` : undefined };
      }), seatsLeft: event.capacity == null ? null : Math.max(0, event.capacity - taken), deadlines: deadlinesByEvent.get(event.$id) ?? [], sexMissing: event.event_type === "championship" && !student.sex });
  }

  const entries: StudentEventEntry[] = mine.flatMap((registration) => {
    const event = eventById.get(registration.event_id);
    if (!event) return [];
    const locked = Boolean(registration.external_submitted_at) || isCategoryChangeLocked({ deadlines: deadlinesByEvent.get(event.$id) ?? [], eventStartsAt: event.starts_at, registrationClosesAt: event.registration_closes_at });
    return [
      {
        registration,
        event,
        option: optionById.get(registration.option_id),
        charge: registration.charge_id ? (chargeById.get(registration.charge_id) ?? null) : null,
        federationCharge: registration.federation_charge_id ? (chargeById.get(registration.federation_charge_id) ?? null) : null,
        documents: documents.rows.filter((document) => document.registration_id === registration.$id),
        result: resultByRegistration.get(registration.$id) ?? null,
        weightLocked: locked
      }
    ];
  });
  const activeStatuses = ["interested", "pending_approval", "confirmed", "waitlisted", "checked_in"];
  const isUpcoming = (entry: StudentEventEntry) => activeStatuses.includes(entry.registration.status) && !isEventTerminal(entry.event.status) && Date.parse(entry.event.starts_at) >= now.getTime() - 6 * 3600_000;
  return {
    ...empty,
    student,
    open,
    upcoming: entries.filter(isUpcoming).sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at)),
    past: entries.filter((entry) => !isUpcoming(entry)).sort((a, b) => b.event.starts_at.localeCompare(a.event.starts_at))
  };
}
