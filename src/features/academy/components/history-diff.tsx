import type { DiffRow } from "@/features/academy/history-rules";

/** Diferença campo a campo entre duas versões. Em telas estreitas cada campo vira um bloco empilhado. */
export function HistoryDiff({ rows }: { rows: DiffRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Nenhum campo mudou nesta revisão.</p>;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Campos alterados">
      {rows.map((row) => (
        <li key={row.field} className="grid grid-cols-1 gap-1 p-3 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3">
          <span className="font-medium">{row.label}</span>
          <span className="text-muted-foreground">
            <span className="sr-only">Antes: </span>
            <span className="sm:hidden">Antes: </span>
            {row.before}
          </span>
          <span>
            <span className="sr-only">Depois: </span>
            <span className="text-muted-foreground sm:hidden">Depois: </span>
            {row.after}
          </span>
        </li>
      ))}
    </ul>
  );
}
