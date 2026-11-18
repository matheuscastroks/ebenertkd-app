/** Retorna a data atual em America/Sao_Paulo no formato YYYY-MM-DD. */
export function saoPauloToday(reference = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Retorna a competência atual (YYYY-MM) no fuso de negócio America/Sao_Paulo. */
export function saoPauloCurrentCompetence(reference = new Date()): string {
  return saoPauloToday(reference).slice(0, 7);
}

/** Retorna o ano atual em America/Sao_Paulo. */
export function saoPauloCurrentYear(reference = new Date()): number {
  return Number(saoPauloToday(reference).slice(0, 4));
}

/** Calcula a diferença em dias inteiros entre duas datas (YYYY-MM-DD ou ISO). */
export function daysBetweenIsoDates(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  const toMs = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.round((toMs - fromMs) / 86400000);
}

/** Formata data ISO para dd/MM/yyyy em UTC para datas de negócio sem deslocamento de fuso. */
export function formatBusinessDateBr(value?: string | null): string {
  if (!value) return "—";
  const isoDay = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return "—";
  const [year, month, day] = isoDay.split("-");
  return `${day}/${month}/${year}`;
}

/** Converte telefone brasileiro para link wa.me/55... quando válido. */
export function whatsappLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  if (normalized.length < 12 || normalized.length > 13) return null;
  return `https://wa.me/${normalized}`;
}
