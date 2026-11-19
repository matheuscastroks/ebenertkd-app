import { holdsSeat } from "@/features/events/rules/status-rules";
import type { RegistrationStatus } from "@/features/events/types";

export type SeatedRegistration = {
  id: string;
  option_id: string;
  status: RegistrationStatus;
  companions: number;
  waitlist_position?: number | null;
  created_at: string;
};

/** Vagas usadas por uma inscrição: o participante mais os acompanhantes. */
export function seatsOf(registration: { companions: number }) {
  return 1 + Math.max(0, registration.companions);
}

export function seatsTaken(registrations: readonly SeatedRegistration[], optionId?: string) {
  return registrations
    .filter((registration) => holdsSeat(registration.status) && (!optionId || registration.option_id === optionId))
    .reduce((sum, registration) => sum + seatsOf(registration), 0);
}

export type SeatDecisionInput = {
  eventCapacity?: number | null;
  eventTaken: number;
  optionCapacity?: number | null;
  optionTaken: number;
  seatsWanted: number;
  requiresApproval: boolean;
};

export function hasRoom(capacity: number | null | undefined, taken: number, wanted: number) {
  return capacity == null || taken + wanted <= capacity;
}

/** Reserva de vaga: confirma (ou aguarda aprovação, ocupando lugar) se cabe; senão lista de espera. */
export function decideSeat(input: SeatDecisionInput): "confirmed" | "pending_approval" | "waitlisted" {
  if (!hasRoom(input.eventCapacity, input.eventTaken, input.seatsWanted) || !hasRoom(input.optionCapacity, input.optionTaken, input.seatsWanted)) {
    return "waitlisted";
  }
  return input.requiresApproval ? "pending_approval" : "confirmed";
}

/** Fila de espera em ordem de chegada (posição, depois data de criação). */
export function waitlistOrder<T extends SeatedRegistration>(registrations: readonly T[]) {
  return registrations
    .filter((registration) => registration.status === "waitlisted")
    .sort((a, b) => (a.waitlist_position ?? Number.MAX_SAFE_INTEGER) - (b.waitlist_position ?? Number.MAX_SAFE_INTEGER) || a.created_at.localeCompare(b.created_at));
}

/**
 * Quem sai da lista de espera quando abre vaga: respeita a ordem da fila; quem não cabe é pulado
 * (um grupo de 3 não trava quem precisa de 1 lugar) e continua na frente na próxima rodada.
 */
export function planWaitlistPromotions(
  registrations: readonly SeatedRegistration[],
  limits: { eventCapacity?: number | null; optionCapacities?: Record<string, number | null | undefined> }
) {
  let eventTaken = seatsTaken(registrations);
  const optionTaken = new Map<string, number>();
  const taken = (optionId: string) => {
    if (!optionTaken.has(optionId)) optionTaken.set(optionId, seatsTaken(registrations, optionId));
    return optionTaken.get(optionId)!;
  };
  const promoted: string[] = [];
  for (const registration of waitlistOrder(registrations)) {
    const wanted = seatsOf(registration);
    if (!hasRoom(limits.eventCapacity, eventTaken, wanted)) continue;
    if (!hasRoom(limits.optionCapacities?.[registration.option_id], taken(registration.option_id), wanted)) continue;
    promoted.push(registration.id);
    eventTaken += wanted;
    optionTaken.set(registration.option_id, taken(registration.option_id) + wanted);
  }
  return promoted;
}

/** Próxima posição na fila de espera. */
export function nextWaitlistPosition(registrations: readonly SeatedRegistration[]) {
  return waitlistOrder(registrations).reduce((max, registration) => Math.max(max, registration.waitlist_position ?? 0), 0) + 1;
}

function isDemotable(registration: SeatedRegistration) {
  return registration.status === "pending_approval" || registration.status === "confirmed";
}

/**
 * Reconciliação após corrida de inscrições: quem passou do limite (a última a chegar) volta para a
 * lista de espera. Só inscrições ainda não presentes (`pending_approval`/`confirmed`) podem ser rebaixadas.
 */
export function planDemotions(
  registrations: readonly SeatedRegistration[],
  limits: { eventCapacity?: number | null; optionCapacities?: Record<string, number | null | undefined> }
) {
  const holders = registrations
    .filter((registration) => holdsSeat(registration.status))
    // Quem já está presente conta primeiro; os demais, na ordem de chegada.
    .sort((a, b) => Number(isDemotable(a)) - Number(isDemotable(b)) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  let eventTaken = 0;
  const optionTaken = new Map<string, number>();
  const demote: string[] = [];
  for (const registration of holders) {
    const wanted = seatsOf(registration);
    const taken = optionTaken.get(registration.option_id) ?? 0;
    const fits = hasRoom(limits.eventCapacity, eventTaken, wanted) && hasRoom(limits.optionCapacities?.[registration.option_id], taken, wanted);
    if (!fits && isDemotable(registration)) {
      demote.push(registration.id);
      continue;
    }
    eventTaken += wanted;
    optionTaken.set(registration.option_id, taken + wanted);
  }
  return demote;
}
