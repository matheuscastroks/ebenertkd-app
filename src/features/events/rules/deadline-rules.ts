import { eventDayKey } from "@/features/events/dates";
import type { EventDeadlineKind } from "@/features/events/types";
import { daysBetweenIsoDates } from "@/lib/dates";

export type DeadlineLike = { $id?: string; kind: EventDeadlineKind; label: string; due_at: string; notify_days_before?: number | null };

export const DEADLINE_KIND_LABEL: Record<EventDeadlineKind, string> = {
  affiliation: "Filiação na federação",
  registration: "Inscrição na federação",
  category_change: "Troca de categoria",
  weigh_in: "Pesagem",
  payment: "Pagamento",
  custom: "Outro prazo"
};

/** Prazos do cronograma de campeonato oferecidos no assistente, na ordem em que costumam acontecer. */
export const CHAMPIONSHIP_DEADLINE_KINDS: readonly EventDeadlineKind[] = ["affiliation", "registration", "category_change", "weigh_in"];

/** Dias entre `now` e o vencimento, contados no fuso de negócio (negativo = já passou). */
export function daysUntilDeadline(deadline: Pick<DeadlineLike, "due_at">, now: Date = new Date()) {
  return daysBetweenIsoDates(eventDayKey(now.toISOString()), eventDayKey(deadline.due_at));
}

export function deadlineState(deadline: Pick<DeadlineLike, "due_at">, now: Date = new Date()): "passed" | "today" | "upcoming" {
  const days = daysUntilDeadline(deadline, now);
  return days < 0 ? "passed" : days === 0 ? "today" : "upcoming";
}

export function sortDeadlines<T extends Pick<DeadlineLike, "due_at">>(deadlines: readonly T[]) {
  return [...deadlines].sort((a, b) => a.due_at.localeCompare(b.due_at));
}

/** Próximo prazo que ainda não venceu (hoje conta). */
export function nextDeadline<T extends Pick<DeadlineLike, "due_at">>(deadlines: readonly T[], now: Date = new Date()) {
  return sortDeadlines(deadlines).find((deadline) => daysUntilDeadline(deadline, now) >= 0) ?? null;
}

/**
 * Lembrete devido hoje: `upcoming` uma única vez quando entra na janela de `notify_days_before`
 * (padrão 3) e `today` no dia. A chave de idempotência garante um aviso por etapa mesmo se a rotina rodar várias vezes.
 */
export function deadlineReminder(deadline: DeadlineLike, now: Date = new Date()): { stage: "upcoming" | "today"; daysLeft: number } | null {
  const daysLeft = daysUntilDeadline(deadline, now);
  if (daysLeft < 0) return null;
  if (daysLeft === 0) return { stage: "today", daysLeft };
  const window = deadline.notify_days_before ?? 3;
  if (window > 0 && daysLeft <= window) return { stage: "upcoming", daysLeft };
  return null;
}

export function deadlineReminderKey(deadlineId: string, stage: "upcoming" | "today") {
  return `event-deadline:${deadlineId}:${stage}`;
}

export function deadlineReminderCopy(deadline: Pick<DeadlineLike, "label">, eventTitle: string, reminder: { stage: "upcoming" | "today"; daysLeft: number }) {
  const label = deadline.label.toLowerCase();
  if (reminder.stage === "today") return { title: `Prazo hoje: ${deadline.label}`, body: `${eventTitle}: o prazo de ${label} termina hoje.` };
  const days = `${reminder.daysLeft} ${reminder.daysLeft === 1 ? "dia" : "dias"}`;
  return { title: `Prazo em ${days}: ${deadline.label}`, body: `${eventTitle}: o prazo de ${label} termina em ${days}.` };
}

/**
 * Peso e categoria só mudam até o prazo de troca de categoria. Sem esse prazo no cronograma, valem até o
 * encerramento das inscrições (quando o evento deixa de aceitar alterações) ou o início do evento.
 */
export function isCategoryChangeLocked(input: { deadlines: readonly DeadlineLike[]; eventStartsAt: string; registrationClosesAt?: string | null }, now: Date = new Date()) {
  const change = input.deadlines.find((deadline) => deadline.kind === "category_change");
  if (change) return daysUntilDeadline(change, now) < 0;
  const limit = input.registrationClosesAt ?? input.eventStartsAt;
  return Date.parse(limit) < now.getTime();
}
