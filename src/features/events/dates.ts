/** America/Sao_Paulo não tem horário de verão desde 2019: o deslocamento é fixo em -03:00. */
const SAO_PAULO_OFFSET = "-03:00";

/** Combina data (YYYY-MM-DD) e hora (HH:mm) de negócio em um instante ISO (UTC). */
export function saoPauloInstant(day: string, time = "00:00"): string {
  return new Date(`${day}T${time}:00${SAO_PAULO_OFFSET}`).toISOString();
}

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const longFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short" });

export function formatEventDay(value?: string | null) {
  return value ? dayFormatter.format(new Date(value)) : "—";
}

export function formatEventTime(value?: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "—";
}

export function formatEventDayTime(value?: string | null) {
  return value ? `${formatEventDay(value)} às ${formatEventTime(value)}` : "—";
}

export function formatEventShort(value?: string | null) {
  return value ? longFormatter.format(new Date(value)).replace(".", "") : "—";
}

/** Dia (YYYY-MM-DD) de um instante no fuso de negócio. */
export function eventDayKey(value: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
