import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { EventsSummaryCard } from "@/features/events/components/events-summary-card";
import { getEventsSummary } from "@/features/events/summary-service";
import { getAnnualExecutiveOverview } from "@/features/operations/annual-analytics-service";
import {
  AnnualRevenueAreaChart,
  AnnualSeasonalityBarChart,
  BeltPyramidChart,
} from "@/features/operations/components/annual-charts";
import { AnnualYearPicker } from "@/features/operations/components/annual-year-picker";
import { requireProfile } from "@/lib/auth/session";
import { formatBrl } from "@/lib/money";

type SearchParams = Promise<{ year?: string }>;

async function AnnualReportContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedYear =
    params.year && /^\d{4}$/.test(params.year) ? Number(params.year) : undefined;

  const { report, years } = await getAnnualExecutiveOverview(requestedYear);
  const eventsSummary = await getEventsSummary(String(report.year));
  const netSign = report.netGrowth > 0 ? "+" : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <AnnualYearPicker year={report.year} years={years} />
        <p className="text-xs text-muted-foreground tabular-nums">
          Pagamentos em dia no ano:{" "}
          <span className="font-semibold text-foreground">{report.collectionRatePct}%</span>
          {" · "}
          {report.activeStudentsCount} alunos ativos na base atual
        </p>
      </div>

      <dl
        aria-label={`Indicadores anuais de ${report.year}`}
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Receita anual realizada</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {formatBrl(report.annualReceivedCents)}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            Previsto: {formatBrl(report.annualExpectedCents)}
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Crescimento líquido</dt>
          <dd
            className={
              report.netGrowth >= 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
            }
          >
            {netSign}
            {report.netGrowth}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            {report.newEnrollmentsTotal} entradas · {report.cancellationsTotal} saídas
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Mensalidade média</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatBrl(report.averageTicketCents)}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            Permanência média: {report.averageTenureMonths} meses
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Graduações no ano</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {report.totalGraduationsInYear}
          </dd>
          <p className="text-xs text-muted-foreground">trocas de faixa registradas</p>
        </div>
      </dl>

      <AnnualRevenueAreaChart series={report.monthlySeries} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnnualSeasonalityBarChart series={report.monthlySeries} />
        <BeltPyramidChart distribution={report.beltDistribution} />
      </div>

      <EventsSummaryCard summary={eventsSummary} periodLabel={String(report.year)} />

      <section
        aria-labelledby="quarterly-summary-heading"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
      >
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h2 id="quarterly-summary-heading" className="text-base font-semibold">
            Desempenho por trimestre · {report.year}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 sm:px-5">Período</th>
                <th className="px-4 py-3 text-right">Previsto</th>
                <th className="px-4 py-3 text-right">Realizado</th>
                <th className="px-4 py-3 text-right">Entradas</th>
                <th className="px-4 py-3 text-right">Saídas</th>
                <th className="px-4 py-3 text-right sm:px-5">Graduações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.quarters.map((q) => (
                <tr key={q.quarter} className="t-interactive-row hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">{q.quarter}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatBrl(q.expectedCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-success-foreground">
                    {formatBrl(q.receivedCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{q.newEnrollments}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">
                    {q.cancelledEnrollments}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-5">{q.graduations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default async function AdminAnnualReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      title="Relatórios"
      subtitle="Visão executiva de 12 meses: sazonalidade, receita acumulada, permanência e evolução técnica."
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <TableRowsSkeleton columns={5} rows={4} />
            </div>
          }
        >
          <AnnualReportContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
