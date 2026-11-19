import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { beltNameOf, toPublicRank } from "@/features/academy/belt-rules";
import { getBeltRanks } from "@/features/academy/config-service";
import type { Charge } from "@/features/billing/types";
import { SIMPLE_EVENT_TYPES, toSeated } from "@/features/events/event-service";
import { seatsTaken } from "@/features/events/rules/capacity-rules";
import { evaluateEventEligibility } from "@/features/events/rules/eligibility-rules";
import { effectiveRegistrationState, isEventTerminal } from "@/features/events/rules/status-rules";
import { parseEligibilityJson } from "@/features/events/schemas";
import type { Event, EventOption, EventRegistration } from "@/features/events/types";
import { resolveStudentProfile } from "@/features/students/access";
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
};

export type StudentOpenEvent = {
  event: Event;
  registrationState: "not_open" | "open" | "closed";
  options: StudentEventOption[];
  seatsLeft: number | null;
};

export type StudentEventEntry = {
  registration: EventRegistration;
  event: Event;
  option?: EventOption;
  charge?: Charge | null;
};

/**
 * Eventos simples vistos por um aluno ou pelo responsável. Convidados e inscrições de outras pessoas
 * nunca aparecem: só contagens de vagas. Menores não recebem dados financeiros.
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

  const [events, ranks] = await Promise.all([
    tables.listRows<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, queries: [Query.equal("event_type", [...SIMPLE_EVENT_TYPES]), Query.orderAsc("starts_at"), Query.limit(200)] }),
    getBeltRanks()
  ]);
  const visible = events.rows.filter((event) => event.status !== "draft");
  const eventIds = visible.map((event) => event.$id);
  if (!eventIds.length) return { ...empty, student };
  const [options, registrations] = await Promise.all([
    tables.listRows<EventOption>({ databaseId, tableId: APPWRITE_IDS.tables.eventOptions, queries: [Query.equal("event_id", eventIds), Query.limit(2000)] }),
    tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", eventIds), Query.limit(5000)] })
  ]);
  const publicRanks = ranks.map(toPublicRank);
  const optionsByEvent = new Map<string, EventOption[]>();
  for (const option of options.rows) optionsByEvent.set(option.event_id, [...(optionsByEvent.get(option.event_id) ?? []), option]);
  const registrationsByEvent = new Map<string, EventRegistration[]>();
  for (const registration of registrations.rows) registrationsByEvent.set(registration.event_id, [...(registrationsByEvent.get(registration.event_id) ?? []), registration]);

  const mine = registrations.rows.filter((registration) => registration.student_id === student.$id);
  const chargeIds = showFinancial ? mine.flatMap((registration) => (registration.charge_id ? [registration.charge_id] : [])) : [];
  const charges = chargeIds.length ? (await tables.listRows<Charge>({ databaseId, tableId: APPWRITE_IDS.tables.charges, queries: [Query.equal("$id", chargeIds), Query.limit(500)] })).rows : [];
  const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
  const eventById = new Map(visible.map((event) => [event.$id, event]));
  const optionById = new Map(options.rows.map((option) => [option.$id, option]));

  const now = new Date();
  const open: StudentOpenEvent[] = [];
  for (const event of visible) {
    if (isEventTerminal(event.status) || Date.parse(event.starts_at) < now.getTime()) continue;
    const eventRegistrations = registrationsByEvent.get(event.$id) ?? [];
    const seated = eventRegistrations.map(toSeated);
    const taken = seatsTaken(seated);
    const state = effectiveRegistrationState(event, now);
    const optionList = (optionsByEvent.get(event.$id) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((option): StudentEventOption => {
      const result = evaluateEventEligibility({
        rule: parseEligibilityJson(option.eligibility_json),
        athlete: { rankKey: student.rank_key, birthDate: student.birth_date, hasActiveEnrollment: hasEnrollment, hasOverdueCharges: false },
        event: { startsAt: event.starts_at, ageCutoff: event.age_cutoff },
        rankLabel: (key) => beltNameOf(publicRanks, key)
      });
      const optionLeft = option.capacity == null ? null : Math.max(0, option.capacity - seatsTaken(seated, option.$id));
      const eventLeft = event.capacity == null ? null : Math.max(0, event.capacity - taken);
      return {
        option,
        eligible: result.eligible && hasEnrollment,
        reasons: hasEnrollment ? result.reasons : ["matrícula ativa necessária", ...result.reasons],
        seatsLeft: optionLeft == null ? eventLeft : eventLeft == null ? optionLeft : Math.min(optionLeft, eventLeft),
        mine: mine.find((registration) => registration.option_id === option.$id && registration.status !== "cancelled" && registration.status !== "rejected")
      };
    });
    open.push({ event, registrationState: state, options: optionList, seatsLeft: event.capacity == null ? null : Math.max(0, event.capacity - taken) });
  }

  const entries: StudentEventEntry[] = mine.flatMap((registration) => {
    const event = eventById.get(registration.event_id);
    if (!event) return [];
    return [{ registration, event, option: optionById.get(registration.option_id), charge: registration.charge_id ? (chargeById.get(registration.charge_id) ?? null) : null }];
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
