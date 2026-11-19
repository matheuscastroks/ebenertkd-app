export const BADGE_KINDS = ["participation", "medal_gold", "medal_silver", "medal_bronze", "exam_approved", "seminar_attendance"] as const;
export type EarnedBadgeKind = (typeof BADGE_KINDS)[number];
export type EarnedBadgeSource = "event_result" | "event_attendance" | "exam_result";

/** Conquista concedida a um aluno (tabela `student_badges`). Distinta dos marcos de constância da política de gamificação. */
export type EarnedBadge = {
  studentId: string;
  kind: EarnedBadgeKind;
  source: EarnedBadgeSource;
  sourceId: string;
  /** Chave única `source:source_id:kind`: conceder duas vezes a mesma conquista não duplica. */
  sourceKey: string;
  eventId?: string;
  title: string;
  description: string;
};

export const BADGE_KIND_LABEL: Record<EarnedBadgeKind, string> = {
  participation: "Participação em campeonato",
  medal_gold: "Medalha de ouro",
  medal_silver: "Medalha de prata",
  medal_bronze: "Medalha de bronze",
  exam_approved: "Aprovação em exame",
  seminar_attendance: "Presença em aulão ou seminário"
};

export function badgeSourceKey(source: EarnedBadgeSource, sourceId: string, kind: EarnedBadgeKind) {
  return `${source}:${sourceId}:${kind}`;
}

const MEDAL_KIND = { gold: "medal_gold", silver: "medal_silver", bronze: "medal_bronze" } as const;
const MEDAL_WORD = { gold: "ouro", silver: "prata", bronze: "bronze" } as const;

function build(base: { studentId: string; source: EarnedBadgeSource; sourceId: string; eventId?: string }, kind: EarnedBadgeKind, title: string, description: string): EarnedBadge {
  return { ...base, kind, sourceKey: badgeSourceKey(base.source, base.sourceId, kind), title: title.slice(0, 128), description: description.slice(0, 255) };
}

/** Resultado de campeonato: participação sempre, e medalha quando houve colocação no pódio. */
export function badgesForEventResult(input: { studentId: string; resultId: string; eventId: string; eventTitle: string; medal: "gold" | "silver" | "bronze" | "none" }): EarnedBadge[] {
  const base = { studentId: input.studentId, source: "event_result" as const, sourceId: input.resultId, eventId: input.eventId };
  const badges = [build(base, "participation", `Competiu: ${input.eventTitle}`, "Representou a academia em campeonato.")];
  if (input.medal !== "none") badges.push(build(base, MEDAL_KIND[input.medal], `Medalha de ${MEDAL_WORD[input.medal]}: ${input.eventTitle}`, `Subiu ao pódio em ${input.eventTitle}.`));
  return badges;
}

/** Presença registrada em aulão ou seminário (check-in concluído com o evento). */
export function badgeForSeminarAttendance(input: { studentId: string; registrationId: string; eventId: string; eventTitle: string }): EarnedBadge {
  return build({ studentId: input.studentId, source: "event_attendance", sourceId: input.registrationId, eventId: input.eventId }, "seminar_attendance", `Participou: ${input.eventTitle}`, "Presença confirmada no evento.");
}

/** Aprovação em exame de faixa. */
export function badgeForExamApproval(input: { studentId: string; participantId: string; eventId: string; beltName: string }): EarnedBadge {
  return build({ studentId: input.studentId, source: "exam_result", sourceId: input.participantId, eventId: input.eventId }, "exam_approved", `Aprovado para a faixa ${input.beltName}`, "Graduação conquistada em exame de faixa.");
}

export type BadgeTotals = { participations: number; medals: number; gold: number; silver: number; bronze: number; exams: number; seminars: number; events: number };

/** Totais usados pelas conquistas de política (`events_attended`, `medals`) e pelo perfil. */
export function summarizeBadges(badges: ReadonlyArray<{ kind: EarnedBadgeKind }>): BadgeTotals {
  const count = (kind: EarnedBadgeKind) => badges.filter((badge) => badge.kind === kind).length;
  const gold = count("medal_gold");
  const silver = count("medal_silver");
  const bronze = count("medal_bronze");
  const participations = count("participation");
  const seminars = count("seminar_attendance");
  return { participations, medals: gold + silver + bronze, gold, silver, bronze, exams: count("exam_approved"), seminars, events: participations + seminars };
}
