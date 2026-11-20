import type { Event, EventStatus, RegistrationStatus } from "@/features/events/types";

export const EVENT_STATUS_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["published", "registration_open", "cancelled"],
  published: ["draft", "registration_open", "registration_closed", "in_progress", "cancelled"],
  registration_open: ["published", "registration_closed", "in_progress", "completed", "cancelled"],
  registration_closed: ["registration_open", "in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export const REGISTRATION_STATUS_TRANSITIONS: Record<RegistrationStatus, readonly RegistrationStatus[]> = {
  interested: ["pending_approval", "confirmed", "waitlisted", "rejected", "cancelled"],
  pending_approval: ["confirmed", "waitlisted", "rejected", "cancelled"],
  waitlisted: ["pending_approval", "confirmed", "rejected", "cancelled"],
  confirmed: ["checked_in", "completed", "no_show", "waitlisted", "cancelled"],
  checked_in: ["completed", "no_show", "confirmed"],
  completed: [],
  no_show: ["confirmed", "checked_in"],
  rejected: [],
  cancelled: []
};

export function canTransitionEvent(from: EventStatus, to: EventStatus) {
  return EVENT_STATUS_TRANSITIONS[from].includes(to);
}

export function assertEventTransition(from: EventStatus, to: EventStatus) {
  if (!canTransitionEvent(from, to)) throw new Error("event_invalid_transition");
}

export function canTransitionRegistration(from: RegistrationStatus, to: RegistrationStatus) {
  return REGISTRATION_STATUS_TRANSITIONS[from].includes(to);
}

export function assertRegistrationTransition(from: RegistrationStatus, to: RegistrationStatus) {
  if (!canTransitionRegistration(from, to)) throw new Error("registration_invalid_transition");
}

/** Evento encerrado: não aceita inscrições nem alterações de participantes. */
export function isEventTerminal(status: EventStatus) {
  return status === "completed" || status === "cancelled";
}

/** Inscrição que ocupa lugar (conta na capacidade). Lista de espera e interesse não ocupam. */
export function holdsSeat(status: RegistrationStatus) {
  return status === "pending_approval" || status === "confirmed" || status === "checked_in" || status === "completed";
}

/** Inscrição ainda viva (nem cancelada nem recusada). */
export function isActiveRegistration(status: RegistrationStatus) {
  return status !== "cancelled" && status !== "rejected";
}

type RegistrationWindowInput = Pick<Event, "status" | "registration_opens_at" | "registration_closes_at">;

/**
 * Situação efetiva das inscrições: as datas abrem e encerram sozinhas, e o professor pode forçar
 * pelo status (`registration_open` / `registration_closed`). Não altera o status armazenado.
 */
export function effectiveRegistrationState(event: RegistrationWindowInput, now: Date = new Date()): "not_open" | "open" | "closed" {
  if (event.status === "draft") return "not_open";
  if (event.status === "completed" || event.status === "cancelled" || event.status === "in_progress" || event.status === "registration_closed") return "closed";
  const closes = event.registration_closes_at ? Date.parse(event.registration_closes_at) : null;
  const opens = event.registration_opens_at ? Date.parse(event.registration_opens_at) : null;
  if (closes !== null && closes <= now.getTime()) return "closed";
  if (event.status === "registration_open") return "open";
  // published: abre sozinho quando há data de abertura
  if (opens !== null && opens <= now.getTime()) return "open";
  return "not_open";
}

export function isRegistrationOpen(event: RegistrationWindowInput, now: Date = new Date()) {
  return effectiveRegistrationState(event, now) === "open";
}

/** O evento já aconteceu (fim no passado). */
export function isEventPast(event: Pick<Event, "starts_at" | "ends_at">, now: Date = new Date()) {
  const end = Date.parse(event.ends_at ?? event.starts_at);
  return Number.isFinite(end) && end < now.getTime();
}
