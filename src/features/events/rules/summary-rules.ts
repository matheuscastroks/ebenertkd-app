import type { Event, EventResult } from "@/features/events/types";

export type EventsSummary = {
  events: number;
  championships: number;
  participants: number;
  gold: number;
  silver: number;
  bronze: number;
};

/**
 * Resumo de eventos de um período (`prefix` = `YYYY` ou `YYYY-MM`) para o relatório anual e o fechamento.
 * Conta eventos realizados (não rascunho nem cancelado), presenças e medalhas dos resultados.
 */
export function summarizeEvents(input: {
  events: ReadonlyArray<Pick<Event, "$id" | "event_type" | "status" | "starts_at">>;
  presentRegistrations: ReadonlyArray<{ event_id: string }>;
  results: ReadonlyArray<Pick<EventResult, "event_id" | "medal">>;
  prefix: string;
}): EventsSummary {
  const inPeriod = input.events.filter((event) => event.event_type !== "belt_exam" && event.status !== "draft" && event.status !== "cancelled" && event.starts_at.startsWith(input.prefix));
  const ids = new Set(inPeriod.map((event) => event.$id));
  const results = input.results.filter((result) => ids.has(result.event_id));
  return {
    events: inPeriod.length,
    championships: inPeriod.filter((event) => event.event_type === "championship").length,
    participants: input.presentRegistrations.filter((registration) => ids.has(registration.event_id)).length,
    gold: results.filter((result) => result.medal === "gold").length,
    silver: results.filter((result) => result.medal === "silver").length,
    bronze: results.filter((result) => result.medal === "bronze").length
  };
}
