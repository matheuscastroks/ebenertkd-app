/** Datas civis são ancoradas ao meio-dia de São Paulo para não retroceder um dia. */
export function ReadableDate({ value, weekday = false }: { value?: string | null; weekday?: boolean }) {
  if (!value) return <span>Não informada</span>;
  const instant = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-03:00` : value;
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return <span>Não informada</span>;
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "numeric", month: "short", year: "numeric",
    ...(weekday ? { weekday: "short" as const } : {})
  }).format(date);
  return <time dateTime={value} className="tabular-nums">{label}</time>;
}
