import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowRight, ChevronDownIcon, Download } from "@/components/ui/icons";
import { BillingOverviewChart } from "@/features/billing/components/billing-overview-chart";
import { ClosingBreakdownChart } from "@/features/billing/components/closing-breakdown-chart";
import { ClosingCompetencePicker } from "@/features/billing/components/closing-competence-picker";
import { formatCompetence } from "@/features/billing/format-competence";
import { getMonthlyClosingOverview } from "@/features/billing/report-service";
import { EventsSummaryCard } from "@/features/events/components/events-summary-card";
import { getEventsSummary } from "@/features/events/summary-service";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";

const PENDING_PREVIEW = 12;

type ClosingOverview = Awaited<ReturnType<typeof getMonthlyClosingOverview>>;

/**
 * Fechamento do mês: primeiro o que impede fechar (comprovantes e atrasos),
 * depois o resumo em quatro números e, recolhidos, gráficos e o resultado por categoria.
 */
export async function MonthlyClosingContent({ competence }: { competence?: string }) {
  const data = await getMonthlyClosingOverview(competence);
  const label = formatCompetence(data.report.competence);
  const eventsSummary = await getEventsSummary(data.report.competence);

  return (
    <div className="space-y-6">
      <ClosingToolbar data={data} />
      <PendingSection data={data} label={label} />
      <SummaryList data={data} label={label} />
      <DetailsSection data={data} label={label} />
      <EventsSummaryCard summary={eventsSummary} periodLabel={label} />
    </div>
  );
}

function ClosingToolbar({ data }: { data: ClosingOverview }) {
  const { report, competences } = data;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <ClosingCompetencePicker competence={report.competence} competences={competences} />
      <Button asChild variant="outline" className="min-h-11">
        <Link href={`${ROUTES.adminBilling}/exportar?competence=${encodeURIComponent(report.competence)}`}>
          <Download className="size-4" aria-hidden="true" />
          Exportar CSV
        </Link>
      </Button>
    </div>
  );
}

function PendingSection({ data, label }: { data: ClosingOverview; label: string }) {
  const { report, openCharges } = data;
  const competenceParam = encodeURIComponent(report.competence);

  if (openCharges.length === 0 && report.readyToClose) {
    return (
      <section aria-labelledby="closing-pending-heading" className="rounded-xl border border-border bg-card p-4 shadow-xs sm:px-5">
        <h2 id="closing-pending-heading" className="text-base font-semibold">Nada pendente em {label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Todos os comprovantes foram conferidos e não há mensalidades em atraso.</p>
      </section>
    );
  }

  const hidden = openCharges.length - PENDING_PREVIEW;
  return (
    <section aria-labelledby="closing-pending-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="closing-pending-heading" className="text-base font-semibold">
            Para fechar {label} ({openCharges.length})
          </h2>
          {report.underReviewCount > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {report.underReviewCount} comprovante{report.underReviewCount === 1 ? "" : "s"} esperando conferência ({formatBrl(report.underReviewCents)}).
            </p>
          ) : null}
        </div>
        {report.underReviewCount > 0 ? (
          <Button asChild size="sm" className="min-h-10 shrink-0">
            <Link href={`${ROUTES.adminBilling}?status=proof_under_review&competence=${competenceParam}`}>
              Conferir comprovantes
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>

      {openCharges.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {openCharges.slice(0, PENDING_PREVIEW).map((charge) => (
            <li key={charge.$id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{charge.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {charge.description} · Vencimento{" "}
                  <span className="tabular-nums">{formatBusinessDateBr(charge.due_date)}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={charge.status === "proof_under_review" ? "info" : "danger"}>
                  {charge.status === "proof_under_review" ? "Comprovante enviado" : "Em atraso"}
                </StatusBadge>
                <span className="text-sm font-semibold tabular-nums">{formatBrl(charge.amount_cents)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href={`${ROUTES.adminBilling}?competence=${competenceParam}`}
        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {hidden > 0 ? `Ver todas as ${openCharges.length} em Cobranças` : "Abrir em Cobranças"}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

function SummaryList({ data, label }: { data: ClosingOverview; label: string }) {
  const { report } = data;
  const hasOverdue = report.overdueCents > 0;
  return (
    <dl
      aria-label={`Resumo de ${label}`}
      className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
    >
      <SummaryItem
        term="Previsto"
        value={formatBrl(report.expectedCents)}
        note={`Recebido: ${formatBrl(report.receivedCompetenceCents)}`}
      />
      <SummaryItem
        term="Entrou no caixa"
        value={formatBrl(report.netCashInMonthCents)}
        note={`Inclui ${formatBrl(report.recoveredPriorCents)} de meses anteriores`}
      />
      <SummaryItem
        term="Em atraso"
        value={formatBrl(report.overdueCents)}
        valueClassName={hasOverdue ? "text-destructive" : undefined}
        note={`${report.overdueCount} cobrança${report.overdueCount === 1 ? "" : "s"} · ${report.defaultRatePct}% do previsto`}
      />
      <SummaryItem
        term="Estornos"
        value={formatBrl(report.reversalsCents)}
        note={`${report.reversalsCount} registrado${report.reversalsCount === 1 ? "" : "s"}`}
      />
    </dl>
  );
}

function SummaryItem({ term, value, note, valueClassName }: { term: string; value: string; note: string; valueClassName?: string }) {
  return (
    <div className="p-4 sm:px-5">
      <dt className="text-sm font-medium text-muted-foreground">{term}</dt>
      <dd className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${valueClassName ?? "text-foreground"}`}>{value}</dd>
      <dd className="text-xs text-muted-foreground tabular-nums">{note}</dd>
    </div>
  );
}

function DetailsSection({ data, label }: { data: ClosingOverview; label: string }) {
  const { report, monthlySeries } = data;
  const totalCharges = report.categories.reduce((sum, item) => sum + item.chargeCount, 0);
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group min-h-11 px-2">
          Ver resultado do mês e gráficos
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-(--duration-fast) ease-(--ease-smooth-out) group-data-[state=open]:-scale-y-100 motion-reduce:transition-none"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-6">
        <section aria-labelledby="closing-result-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h2 id="closing-result-heading" className="text-base font-semibold">Resultado do mês · {label}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3 sm:px-5">Categoria</th>
                  <th className="px-4 py-3 text-right">Cobranças</th>
                  <th className="px-4 py-3 text-right">Previsto</th>
                  <th className="px-4 py-3 text-right">Recebido</th>
                  <th className="px-4 py-3 text-right">Em atraso</th>
                  <th className="px-4 py-3 text-right sm:px-5">Em aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.categories.map((cat) => (
                  <tr key={cat.type}>
                    <td className="px-4 py-3 font-medium text-foreground sm:px-5">{cat.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{cat.chargeCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatBrl(cat.expectedCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success-foreground">{formatBrl(cat.paidCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-destructive">{formatBrl(cat.overdueCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground sm:px-5">{formatBrl(cat.openCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30 font-semibold">
                  <td className="px-4 py-3 sm:px-5">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalCharges}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBrl(report.expectedCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-success-foreground">{formatBrl(report.receivedCompetenceCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">{formatBrl(report.overdueCents)}</td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                    {formatBrl(report.pendingCents + report.underReviewCents + report.overdueCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Por categoria · {label}</h2>
            <ClosingBreakdownChart categories={report.categories} />
          </section>
          <section className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Receita nos últimos 6 meses</h2>
            <BillingOverviewChart
              monthlySeries={monthlySeries}
              receivedCents={report.receivedCompetenceCents}
              pendingCents={report.pendingCents}
              overdueCents={report.overdueCents}
              underReviewCents={report.underReviewCents}
            />
          </section>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
