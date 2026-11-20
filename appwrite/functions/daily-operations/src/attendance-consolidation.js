/**
 * Consolidação de faltas do check-in: ao fim do dia da aula, quem ficou sem registro
 * (sem check-in válido nem justificativa, e sem marcação do professor) recebe falta.
 * Só aulas que existem como linha (criadas pelo professor ou pelo primeiro check-in/justificativa)
 * são consolidadas: dia de treino sem nenhum registro não vira falta coletiva (feriado, treino suspenso).
 */

/** Data de hoje (YYYY-MM-DD) em America/Sao_Paulo. */
export function saoPauloDay(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Aula aberta de um dia anterior a hoje: pronta para consolidar. */
export function lessonReadyToClose(lesson, today) {
  return lesson.status === "open" && lesson.lesson_date.slice(0, 10) < today;
}

/** Vínculos da turma que valiam na data da aula (mesma regra da chamada do professor). */
export function eligibleLinks(links, lessonDate) {
  const lessonTime = new Date(lessonDate).getTime();
  return links.filter((link) => new Date(link.started_at).getTime() <= lessonTime && (!link.ended_at || new Date(link.ended_at).getTime() >= lessonTime));
}

/** Vínculos elegíveis que ainda não têm registro de presença nesta aula. */
export function missingAttendance(lesson, links, records) {
  const recorded = new Set(records.map((record) => record.class_enrollment_id));
  return eligibleLinks(links, lesson.lesson_date).filter((link) => !recorded.has(link.$id));
}
