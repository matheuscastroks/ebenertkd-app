import "server-only";

import { Query } from "node-appwrite";
import type { Profile } from "@/features/auth/types";
import { listTrainingClasses } from "@/features/classes/service";
import { EVENT_STATUS_LABEL, EVENT_TYPE_LABEL } from "@/features/events/labels";
import type { Event } from "@/features/events/types";
import { dependentSummaryPath } from "@/features/families/paths";
import { listGuardianMinors } from "@/features/families/service";
import type { Student } from "@/features/students/types";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import {
  adminClassPath,
  adminEnrollmentPath,
  adminEventPath,
  adminExamPath,
  guardianEventsPath,
  guardianExamsPath,
  ROUTES,
} from "@/lib/navigation/routes";
import { normalizeSearchText, scoreSearchCandidate } from "@/lib/search/semantic-engine";
import type { SearchResultItem } from "@/lib/search/types";

type IndexedStudent = {
  id: string;
  fullName: string;
  rankKey: string | null;
  trainingClass: string | null;
  status: Student["status"];
};

type IndexedEvent = {
  id: string;
  title: string;
  eventType: Event["event_type"];
  status: Event["status"];
  startsAt: string;
  locationText: string | null;
};

const STUDENT_STATUS_LABEL: Record<Student["status"], string> = {
  draft: "Rascunho",
  submitted: "Em análise",
  active: "Ativo",
  inactive: "Inativo",
};

function formatShortDatePtBr(iso: string): string | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(parsed));
}

function getSearchStudentsIndex() {
  return cachedRead(
    {
      name: "search-students-index",
      key: [],
      tags: [CACHE_TAGS.enrollments],
      revalidate: 60,
    },
    async (): Promise<IndexedStudent[]> => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<Student>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.students,
        queries: [Query.orderAsc("full_name"), Query.limit(200)],
      });
      return result.rows.map((student) => ({
        id: student.$id,
        fullName: student.full_name,
        rankKey: student.rank_key ?? null,
        trainingClass: student.training_class ?? null,
        status: student.status,
      }));
    }
  );
}

function getSearchEventsIndex() {
  return cachedRead(
    {
      name: "search-events-index",
      key: [],
      tags: [CACHE_TAGS.events],
      revalidate: 60,
    },
    async (): Promise<IndexedEvent[]> => {
      const { tables, config } = createAppwriteAdminClient();
      const result = await tables.listRows<Event>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.events,
        queries: [Query.orderDesc("starts_at"), Query.limit(100)],
      });
      return result.rows.map((event) => ({
        id: event.$id,
        title: event.title,
        eventType: event.event_type,
        status: event.status,
        startsAt: event.starts_at,
        locationText: event.location_text ?? null,
      }));
    }
  );
}

function rankAndSlice<T>(
  items: T[],
  rawQuery: string,
  limit: number,
  buildCandidate: (item: T) => { title: string; subtitle?: string; keywords?: string[] },
  toResult: (item: T, score: number) => SearchResultItem
): SearchResultItem[] {
  return items
    .map((item, index) => {
      const score = scoreSearchCandidate(buildCandidate(item), rawQuery);
      return { item, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item, score }) => toResult(item, score));
}

/**
 * Busca entidades reais (alunos, turmas, eventos, dependentes) no Appwrite,
 * respeitando estritamente o perfil e as permissões do usuário autenticado.
 */
export async function searchEntitiesForProfile(
  profile: Profile,
  rawQuery: string
): Promise<SearchResultItem[]> {
  if (rawQuery.length > 80 || normalizeSearchText(rawQuery).length < 2) {
    return [];
  }

  if (profile.role === "admin") {
    const [students, classes, events] = await Promise.all([
      getSearchStudentsIndex().catch(() => [] as IndexedStudent[]),
      listTrainingClasses(true).catch(() => []),
      getSearchEventsIndex().catch(() => [] as IndexedEvent[]),
    ]);

    const studentResults = rankAndSlice(
      students,
      rawQuery,
      5,
      (student) => ({
        title: student.fullName,
        subtitle: student.trainingClass ?? undefined,
        keywords: [
          "aluno",
          STUDENT_STATUS_LABEL[student.status],
          student.rankKey ?? "",
          student.trainingClass ?? "",
        ].filter(Boolean),
      }),
      (student, score) => {
        const statusLabel = STUDENT_STATUS_LABEL[student.status];
        const parts = [student.trainingClass, statusLabel].filter(Boolean);
        return {
          id: `student-${student.id}`,
          kind: "student",
          title: student.fullName,
          subtitle: parts.join(" · "),
          href: adminEnrollmentPath(student.id),
          icon: "students",
          badge: "Aluno",
          score,
        };
      }
    );

    const classResults = rankAndSlice(
      classes,
      rawQuery,
      4,
      (cls) => ({
        title: cls.name,
        subtitle: [cls.weekdays.join(", "), `${cls.start_time}–${cls.end_time}`].join(" · "),
        keywords: [
          "turma",
          "aula",
          cls.location ?? "",
          ...cls.weekdays,
          cls.status === "inactive" ? "inativa" : "ativa",
        ].filter(Boolean),
      }),
      (cls, score) => ({
        id: `class-${cls.$id}`,
        kind: "class",
        title: cls.name,
        subtitle: [
          cls.weekdays.join(", "),
          `${cls.start_time}–${cls.end_time}`,
          cls.location,
        ]
          .filter(Boolean)
          .join(" · "),
        href: adminClassPath(cls.$id),
        icon: "classes",
        badge: cls.status === "inactive" ? "Inativa" : "Turma",
        score,
      })
    );

    const eventResults = rankAndSlice(
      events,
      rawQuery,
      4,
      (event) => ({
        title: event.title,
        subtitle: [
          EVENT_TYPE_LABEL[event.eventType],
          EVENT_STATUS_LABEL[event.status],
          event.locationText ?? "",
        ]
          .filter(Boolean)
          .join(" "),
        keywords: [
          "evento",
          EVENT_TYPE_LABEL[event.eventType],
          EVENT_STATUS_LABEL[event.status],
          event.locationText ?? "",
        ].filter(Boolean),
      }),
      (event, score) => {
        const formattedDate = formatShortDatePtBr(event.startsAt);
        const parts = [
          EVENT_TYPE_LABEL[event.eventType],
          formattedDate,
          EVENT_STATUS_LABEL[event.status],
        ].filter(Boolean);
        return {
          id: `event-${event.id}`,
          kind: "event",
          title: event.title,
          subtitle: parts.join(" · "),
          href: event.eventType === "belt_exam" ? adminExamPath(event.id) : adminEventPath(event.id),
          icon: event.eventType === "belt_exam" ? "belt" : "events",
          badge: "Evento",
          score,
        };
      }
    );

    return [...studentResults, ...classResults, ...eventResults];
  }

  const isGuardianCapable =
    profile.role === "guardian" || profile.capabilities.includes("guardian");
  const isStudent =
    profile.role === "adult_student" || profile.role === "minor_student";

  const [dependents, events] = await Promise.all([
    isGuardianCapable ? listGuardianMinors(profile).catch(() => []) : Promise.resolve([]),
    getSearchEventsIndex().catch(() => [] as IndexedEvent[]),
  ]);

  const dependentResults = rankAndSlice(
    dependents,
    rawQuery,
    4,
    (dependent) => ({
      title: dependent.full_name,
      subtitle: dependent.username ? `@${dependent.username}` : undefined,
      keywords: ["dependente", "filho", "menor", dependent.username ?? ""].filter(Boolean),
    }),
    (dependent, score) => ({
      id: `dependent-${dependent.$id}`,
      kind: "dependent",
      title: dependent.full_name,
      subtitle: dependent.username ? `@${dependent.username} · Dependente` : "Dependente vinculado",
      href: dependentSummaryPath(dependent.$id),
      icon: "family",
      badge: "Família",
      score,
    })
  );

  const visibleEvents = events.filter((event) => event.status !== "draft");
  const singleDependentId = !isStudent && dependents.length === 1 ? dependents[0]?.$id : undefined;

  const eventResults = rankAndSlice(
    visibleEvents,
    rawQuery,
    4,
    (event) => ({
      title: event.title,
      subtitle: [
        EVENT_TYPE_LABEL[event.eventType],
        EVENT_STATUS_LABEL[event.status],
        event.locationText ?? "",
      ]
        .filter(Boolean)
        .join(" "),
      keywords: [
        "evento",
        EVENT_TYPE_LABEL[event.eventType],
        EVENT_STATUS_LABEL[event.status],
        event.locationText ?? "",
      ].filter(Boolean),
    }),
    (event, score) => {
      const formattedDate = formatShortDatePtBr(event.startsAt);
      const parts = [
        EVENT_TYPE_LABEL[event.eventType],
        formattedDate,
        EVENT_STATUS_LABEL[event.status],
      ].filter(Boolean);

      let href: string;
      if (isStudent) {
        href = event.eventType === "belt_exam" ? ROUTES.studentExams : ROUTES.studentEvents;
      } else if (singleDependentId) {
        href =
          event.eventType === "belt_exam"
            ? guardianExamsPath(singleDependentId)
            : guardianEventsPath(singleDependentId);
      } else {
        href = ROUTES.guardian;
      }

      return {
        id: `event-${event.id}`,
        kind: "event",
        title: event.title,
        subtitle: parts.join(" · "),
        href,
        icon: event.eventType === "belt_exam" ? "belt" : "events",
        badge: "Evento",
        score,
      };
    }
  );

  return [...dependentResults, ...eventResults];
}
