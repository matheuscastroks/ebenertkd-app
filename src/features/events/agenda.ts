import type { Event } from "@/features/events/types";

/** Divide a agenda em "próximos" (ainda abertos ou em andamento) e "passados/cancelados". */
export function splitAgenda<T extends { event: Event }>(items: readonly T[], now: Date = new Date()) {
  const done = ["completed", "cancelled"];
  // Margem de 12 h: o evento do dia continua em "próximos" até a noite.
  const limit = now.getTime() - 12 * 3600_000;
  const upcoming = items
    .filter((item) => !done.includes(item.event.status) && Date.parse(item.event.ends_at ?? item.event.starts_at) >= limit)
    .sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at));
  const past = items.filter((item) => !upcoming.includes(item));
  return { upcoming, past };
}
