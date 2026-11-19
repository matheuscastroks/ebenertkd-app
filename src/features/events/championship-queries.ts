import "server-only";

import { Query, type Models } from "node-appwrite";
import { beltNameOf, toPublicRank } from "@/features/academy/belt-rules";
import { getBeltRanks } from "@/features/academy/config-service";
import type { Profile } from "@/features/auth/types";
import type { Charge } from "@/features/billing/types";
import { toSeated } from "@/features/events/event-service";
import { seatsTaken } from "@/features/events/rules/capacity-rules";
import { ageClassOf, eventAge } from "@/features/events/rules/eligibility-rules";
import { buildFederationCsv, type FederationExportRow } from "@/features/events/rules/federation-export";
import { classifyForHub, HUB_QUEUES, type HubQueue } from "@/features/events/rules/hub-rules";
import { championshipReadiness, DOCUMENT_KIND_LABEL } from "@/features/events/rules/readiness-rules";
import { isActiveRegistration } from "@/features/events/rules/status-rules";
import type { Event, EventDeadline, EventOption, EventRegistration, EventRegistrationDocument, EventResult, EventType } from "@/features/events/types";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { getStudentPreviews } from "@/features/students/people-preview";
import { CACHE_TAGS } from "@/lib/cache/tags";

const OPEN_CHARGE = ["pending", "overdue", "proof_under_review"];

export type ChampionshipRow = {
  registration: EventRegistration;
  option?: EventOption;
  name: string;
  studentId?: string;
  /** Documento da foto de perfil (rota autorizada), quando houver. */
  photoDocumentId?: string;
  birthDate?: string | null;
  sex?: "feminino" | "masculino" | null;
  beltName?: string | null;
  ageClass?: string | null;
  isMinor: boolean;
  documents: EventRegistrationDocument[];
  charge?: Charge;
  federationCharge?: Charge;
  result?: EventResult;
  readiness: { ready: boolean; missing: string[] };
};

export type ChampionshipBundle = {
  event: Event;
  options: EventOption[];
  deadlines: EventDeadline[];
  rows: ChampionshipRow[];
  seatsTaken: number;
};

async function listByIds<T extends Models.Row>(tableId: string, ids: readonly string[]): Promise<T[]> {
  if (!ids.length) return [];
  const { tables, config } = createAppwriteAdminClient();
  const unique = [...new Set(ids)];
  const rows: T[] = [];
  for (let index = 0; index < unique.length; index += 100) {
    rows.push(...(await tables.listRows<T>({ databaseId: config.databaseId, tableId, queries: [Query.equal("$id", unique.slice(index, index + 100)), Query.limit(100)] })).rows);
  }
  return rows;
}

/** Detalhe de um evento para a professora, com equipe, documentos, cobranças (academia e federação) e resultados. */
export function getChampionshipBundle(eventId: string) {
  return cachedRead(
    { name: "get-championship-bundle", key: [eventId], tags: [CACHE_TAGS.events, CACHE_TAGS.event(eventId), CACHE_TAGS.eventRegistrations(eventId), CACHE_TAGS.billingCharges], revalidate: 60 },
    async (): Promise<ChampionshipBundle> => {
      const { tables, config } = createAppwriteAdminClient();
      const databaseId = config.databaseId;
      const event = await tables.getRow<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, rowId: eventId }).catch(() => {
        throw new Error("event_not_found");
      });
      const [options, deadlines, registrations, results, ranks] = await Promise.all([
        tables.listRows<EventOption>({ databaseId, tableId: APPWRITE_IDS.tables.eventOptions, queries: [Query.equal("event_id", [eventId]), Query.orderAsc("sort_order"), Query.limit(100)] }),
        tables.listRows<EventDeadline>({ databaseId, tableId: APPWRITE_IDS.tables.eventDeadlines, queries: [Query.equal("event_id", [eventId]), Query.orderAsc("due_at"), Query.limit(50)] }),
        tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", [eventId]), Query.orderAsc("$createdAt"), Query.limit(2000)] }),
        tables.listRows<EventResult>({ databaseId, tableId: APPWRITE_IDS.tables.eventResults, queries: [Query.equal("event_id", [eventId]), Query.limit(2000)] }),
        getBeltRanks()
      ]);
      const regs = registrations.rows;
      const students = await listByIds<Student>(APPWRITE_IDS.tables.students, regs.flatMap((row) => (row.student_id ? [row.student_id] : [])));
      const [profiles, charges, documents, previews] = await Promise.all([
        listByIds<Profile>(APPWRITE_IDS.tables.profiles, students.map((student) => student.profile_id)),
        listByIds<Charge>(APPWRITE_IDS.tables.charges, regs.flatMap((row) => [row.charge_id, row.federation_charge_id].filter((id): id is string => Boolean(id)))),
        regs.length
          ? (async () => {
              const found: EventRegistrationDocument[] = [];
              for (let index = 0; index < regs.length; index += 100) {
                found.push(...(await tables.listRows<EventRegistrationDocument>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, queries: [Query.equal("registration_id", regs.slice(index, index + 100).map((row) => row.$id)), Query.limit(500)] })).rows);
              }
              return found;
            })()
          : Promise.resolve([] as EventRegistrationDocument[]),
        getStudentPreviews(students.map((student) => student.$id))
      ]);
      const publicRanks = ranks.map(toPublicRank);
      const studentById = new Map(students.map((student) => [student.$id, student]));
      const profileById = new Map(profiles.map((profile) => [profile.$id, profile]));
      const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
      const optionById = new Map(options.rows.map((option) => [option.$id, option]));
      const resultByRegistration = new Map(results.rows.map((result) => [result.registration_id, result]));
      const rows: ChampionshipRow[] = regs.map((registration) => {
        const student = registration.student_id ? studentById.get(registration.student_id) : undefined;
        const isMinor = student ? profileById.get(student.profile_id)?.role === "minor_student" : false;
        const docs = documents.filter((document) => document.registration_id === registration.$id);
        return {
          registration,
          option: optionById.get(registration.option_id),
          name: student?.full_name ?? registration.guest_name ?? "Aluno",
          studentId: student?.$id,
          photoDocumentId: student ? previews.get(student.$id)?.photoDocumentId : undefined,
          birthDate: student?.birth_date,
          sex: student?.sex,
          beltName: student?.rank_key ? beltNameOf(publicRanks, student.rank_key) : null,
          ageClass: ageClassOf(eventAge(student?.birth_date, event.starts_at, event.age_cutoff))?.label ?? null,
          isMinor,
          documents: docs,
          charge: registration.charge_id ? chargeById.get(registration.charge_id) : undefined,
          federationCharge: registration.federation_charge_id ? chargeById.get(registration.federation_charge_id) : undefined,
          result: resultByRegistration.get(registration.$id),
          readiness: championshipReadiness({ isMinor, termsAcceptedAt: registration.terms_accepted_at, guardianAuthorizedAt: registration.guardian_authorized_at, documents: docs })
        };
      });
      return { event, options: options.rows, deadlines: deadlines.rows, rows, seatsTaken: seatsTaken(regs.map(toSeated)) };
    }
  );
}

/** Linhas do CSV para a federação: equipe confirmada (e, com `includeInterested`, também quem só manifestou interesse). */
export function federationRowsOf(bundle: ChampionshipBundle, includeInterested = false): FederationExportRow[] {
  const statuses = includeInterested ? ["interested", "confirmed", "checked_in", "completed"] : ["confirmed", "checked_in", "completed"];
  return bundle.rows
    .filter((row) => statuses.includes(row.registration.status))
    .map((row) => ({
      name: row.name,
      birthDate: row.birthDate,
      sex: row.sex,
      beltName: row.beltName,
      ageClass: row.ageClass,
      category: row.option?.label ?? "",
      modality: row.option?.modality === "kyorugi" ? "Kyorugi" : row.option?.modality === "poomsae" ? "Poomsae" : "",
      declaredWeightGrams: row.registration.declared_weight_grams,
      authorized: Boolean(row.registration.guardian_authorized_at) || !row.isMinor,
      submitted: Boolean(row.registration.external_submitted_at)
    }));
}

export function championshipCsv(bundle: ChampionshipBundle, includeInterested = false) {
  return buildFederationCsv(federationRowsOf(bundle, includeInterested));
}

export type HubItem = {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  name: string;
  photoDocumentId?: string;
  optionLabel: string;
  status: EventRegistration["status"];
  /** Documentos pendentes de revisão (para a fila de documentos). */
  pendingDocuments: Array<{ id: string; kindLabel: string }>;
  detail?: string;
};

export type RegistrationHub = { queues: Record<HubQueue, HubItem[]>; total: number };

const emptyQueues = (): Record<HubQueue, HubItem[]> => Object.fromEntries(HUB_QUEUES.map((queue) => [queue, [] as HubItem[]])) as unknown as Record<HubQueue, HubItem[]>;

/** Central de inscrições: tudo que espera uma ação da professora, agrupado por pendência. */
export function getRegistrationHub() {
  return cachedRead(
    { name: "get-registration-hub", key: [], tags: [CACHE_TAGS.events, CACHE_TAGS.billingCharges], revalidate: 60 },
    async (): Promise<RegistrationHub> => {
      const { tables, config } = createAppwriteAdminClient();
      const databaseId = config.databaseId;
      const events = (await tables.listRows<Event>({ databaseId, tableId: APPWRITE_IDS.tables.events, queries: [Query.notEqual("event_type", ["belt_exam"]), Query.equal("status", ["published", "registration_open", "registration_closed", "in_progress"]), Query.limit(200)] })).rows;
      const queues = emptyQueues();
      if (!events.length) return { queues, total: 0 };
      const registrations: EventRegistration[] = [];
      const eventIds = events.map((event) => event.$id);
      for (let index = 0; index < eventIds.length; index += 50) {
        registrations.push(...(await tables.listRows<EventRegistration>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrations, queries: [Query.equal("event_id", eventIds.slice(index, index + 50)), Query.limit(5000)] })).rows);
      }
      const live = registrations.filter((row) => isActiveRegistration(row.status) && !["completed", "no_show"].includes(row.status));
      const options = await listByIds<EventOption>(APPWRITE_IDS.tables.eventOptions, live.map((row) => row.option_id));
      const students = await listByIds<Student>(APPWRITE_IDS.tables.students, live.flatMap((row) => (row.student_id ? [row.student_id] : [])));
      const [profiles, charges, previews] = await Promise.all([
        listByIds<Profile>(APPWRITE_IDS.tables.profiles, students.map((student) => student.profile_id)),
        listByIds<Charge>(APPWRITE_IDS.tables.charges, live.flatMap((row) => [row.charge_id, row.federation_charge_id].filter((id): id is string => Boolean(id)))),
        getStudentPreviews(students.map((student) => student.$id))
      ]);
      const documents: EventRegistrationDocument[] = [];
      for (let index = 0; index < live.length; index += 100) {
        const batch = live.slice(index, index + 100).map((row) => row.$id);
        documents.push(...(await tables.listRows<EventRegistrationDocument>({ databaseId, tableId: APPWRITE_IDS.tables.eventRegistrationDocuments, queries: [Query.equal("registration_id", batch), Query.limit(1000)] })).rows);
      }
      const eventById = new Map(events.map((event) => [event.$id, event]));
      const optionById = new Map(options.map((option) => [option.$id, option]));
      const studentById = new Map(students.map((student) => [student.$id, student]));
      const profileById = new Map(profiles.map((profile) => [profile.$id, profile]));
      const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
      let total = 0;
      for (const registration of live) {
        const event = eventById.get(registration.event_id);
        if (!event) continue;
        const student = registration.student_id ? studentById.get(registration.student_id) : undefined;
        const docs = documents.filter((document) => document.registration_id === registration.$id);
        const open = [registration.charge_id, registration.federation_charge_id].some((id) => {
          const charge = id ? chargeById.get(id) : undefined;
          return charge ? OPEN_CHARGE.includes(charge.status) : false;
        });
        const isMinor = student ? profileById.get(student.profile_id)?.role === "minor_student" : false;
        const found = classifyForHub({ registration, eventType: event.event_type, isMinor, documents: docs, hasOpenCharge: open });
        for (const queue of found) {
          queues[queue].push({
            registrationId: registration.$id,
            eventId: event.$id,
            eventTitle: event.title,
            eventType: event.event_type,
            name: student?.full_name ?? registration.guest_name ?? "Convidado",
            photoDocumentId: student ? previews.get(student.$id)?.photoDocumentId : undefined,
            optionLabel: optionById.get(registration.option_id)?.label ?? "—",
            status: registration.status,
            pendingDocuments: docs.filter((document) => document.status === "pending").map((document) => ({ id: document.$id, kindLabel: DOCUMENT_KIND_LABEL[document.kind] })),
            detail: queue === "waitlist" && registration.waitlist_position ? `${registration.waitlist_position}º na fila` : undefined
          });
          total += 1;
        }
      }
      queues.waitlist.sort((a, b) => (a.detail ?? "").localeCompare(b.detail ?? "", "pt-BR", { numeric: true }));
      return { queues, total };
    }
  );
}
