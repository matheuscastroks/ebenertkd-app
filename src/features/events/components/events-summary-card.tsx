import Link from "next/link";
import type { EventsSummary } from "@/features/events/rules/summary-rules";
import { ROUTES } from "@/lib/navigation/routes";

/** Resumo de eventos de um período para o relatório anual e o fechamento mensal. */
export function EventsSummaryCard({ summary, periodLabel }: { summary: EventsSummary; periodLabel: string }) {
  return (
    <section aria-labelledby="events-summary-heading" className="rounded-xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 id="events-summary-heading" className="text-base font-semibold">
          Eventos · {periodLabel}
        </h2>
        <Link href={ROUTES.adminEvents} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Ver agenda
        </Link>
      </div>
      <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Eventos realizados</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{summary.events}</dd>
          <p className="text-xs text-muted-foreground">{summary.championships} campeonato{summary.championships === 1 ? "" : "s"}</p>
        </div>
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Participações</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{summary.participants}</dd>
          <p className="text-xs text-muted-foreground">presenças registradas</p>
        </div>
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Medalhas</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{summary.gold + summary.silver + summary.bronze}</dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            {summary.gold} ouro · {summary.silver} prata · {summary.bronze} bronze
          </p>
        </div>
      </dl>
    </section>
  );
}
