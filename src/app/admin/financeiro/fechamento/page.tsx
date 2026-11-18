import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BillingOverviewChart } from "@/features/billing/components/billing-overview-chart";
import { ClosingBreakdownChart } from "@/features/billing/components/closing-breakdown-chart";
import { ClosingCompetencePicker } from "@/features/billing/components/closing-competence-picker";
import { formatCompetence } from "@/features/billing/format-competence";
import { getMonthlyClosingOverview } from "@/features/billing/report-service";
import { requireProfile } from "@/lib/auth/session";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, Download } from "lucide-react";

type SearchParams = Promise<{ competence?: string }>;

async function MonthlyClosingContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const data = await getMonthlyClosingOverview(params.competence);
  const { report, competences, monthlySeries, openCharges } = data;
  const label = formatCompetence(report.competence);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <ClosingCompetencePicker
          competence={report.competence}
          competences={competences}
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={report.readyToClose ? "success" : "warning"}>
            {report.readyToClose
              ? "Sem comprovantes pendentes"
              : `${report.underReviewCount} comprovante${report.underReviewCount === 1 ? "" : "s"} em análise`}
          </StatusBadge>
          <Button asChild variant="outline" className="min-h-11">
            <Link href={`${ROUTES.adminBilling}/exportar?competence=${encodeURIComponent(report.competence)}`}>
              <Download className="size-4" aria-hidden="true" />
              Exportar competência (CSV)
            </Link>
          </Button>
        </div>
      </div>

      {!report.readyToClose ? (
        <Alert className="rounded-xl border border-warning/30 bg-warning/10 p-4 sm:p-5 text-warning-foreground shadow-xs">
          <AlertTitle className="text-base font-semibold text-warning-foreground">
            Conciliação pendente em {label}
          </AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
            <span>
              Existem <strong>{report.underReviewCount} comprovante(s)</strong> ({formatBrl(report.underReviewCents)}) aguardando validação para fechar o mês contábil.
            </span>
            <Button asChild size="sm" variant="outline" className="min-h-10 bg-background/80 hover:bg-background shrink-0 font-medium">
              <Link
                href={`${ROUTES.adminBilling}?status=proof_under_review&competence=${encodeURIComponent(report.competence)}`}
              >
                Revisar comprovantes
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <dl
        aria-label={`Indicadores de fechamento de ${label}`}
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Previsto na competência</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatBrl(report.expectedCents)}
          </dd>
          <p className="text-xs text-muted-foreground">
            Realizado do mês: {formatBrl(report.receivedCompetenceCents)}
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            Caixa líquido no mês
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-success-foreground">
            {formatBrl(report.netCashInMonthCents)}
          </dd>
          <p className="text-xs text-muted-foreground">
            Inclui {formatBrl(report.recoveredPriorCents)} de meses anteriores
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span
              className={
                report.overdueCents > 0
                  ? "size-2 shrink-0 rounded-full bg-destructive"
                  : "size-2 shrink-0 rounded-full bg-muted-foreground"
              }
              aria-hidden="true"
            />
            Inadimplência ({label})
          </dt>
          <dd
            className={
              report.overdueCents > 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {formatBrl(report.overdueCents)}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            {report.defaultRatePct}% do faturamento previsto ({report.overdueCount} cobranças)
          </p>
        </div>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Estornos no mês</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatBrl(report.reversalsCents)}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            {report.reversalsCount} estorno{report.reversalsCount === 1 ? "" : "s"} registrado{report.reversalsCount === 1 ? "" : "s"}
          </p>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            DRE por categoria · {label}
          </h2>
          <ClosingBreakdownChart categories={report.categories} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Evolução de receita (últimos 6 meses)
          </h2>
          <BillingOverviewChart
            monthlySeries={monthlySeries}
            receivedCents={report.receivedCompetenceCents}
            pendingCents={report.pendingCents}
            overdueCents={report.overdueCents}
            underReviewCents={report.underReviewCents}
          />
        </section>
      </div>

      <section
        aria-labelledby="dre-table-heading"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
      >
        <div className="border-b border-border px-4 py-3.5 sm:px-5">
          <h2 id="dre-table-heading" className="text-base font-semibold">
            Demonstrativo consolidado · {label}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 sm:px-5">Categoria</th>
                <th className="px-4 py-3 text-right">Cobranças</th>
                <th className="px-4 py-3 text-right">Previsto</th>
                <th className="px-4 py-3 text-right">Realizado</th>
                <th className="px-4 py-3 text-right">Em atraso</th>
                <th className="px-4 py-3 text-right sm:px-5">Saldo em aberto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.categories.map((cat) => (
                <tr key={cat.type} className="t-interactive-row hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">{cat.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {cat.chargeCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {formatBrl(cat.expectedCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-success-foreground">
                    {formatBrl(cat.paidCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">
                    {formatBrl(cat.overdueCents)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground sm:px-5">
                    {formatBrl(cat.openCents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30 font-semibold">
                <td className="px-4 py-3 sm:px-5">Total da competência</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {report.categories.reduce((sum, item) => sum + item.chargeCount, 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatBrl(report.expectedCents)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-success-foreground">
                  {formatBrl(report.receivedCompetenceCents)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-destructive">
                  {formatBrl(report.overdueCents)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                  {formatBrl(
                    report.pendingCents + report.underReviewCents + report.overdueCents
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {openCharges.length > 0 ? (
        <section aria-labelledby="closing-open-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="closing-open-heading" className="text-base font-semibold">
              Pendências de fechamento em {label} ({openCharges.length})
            </h2>
            <Button asChild variant="ghost" size="sm" className="min-h-9">
              <Link href={`${ROUTES.adminBilling}?competence=${encodeURIComponent(report.competence)}`}>
                Gerenciar cobranças
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {openCharges.slice(0, 12).map((charge) => (
              <li
                key={charge.$id}
                className="t-interactive-row flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {charge.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {charge.description} · Vencimento{" "}
                    <span className="tabular-nums">{formatBusinessDateBr(charge.due_date)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge
                    tone={charge.status === "proof_under_review" ? "info" : "danger"}
                  >
                    {charge.status === "proof_under_review"
                      ? "Comprovante em análise"
                      : "Em atraso"}
                  </StatusBadge>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatBrl(charge.amount_cents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default async function AdminBillingClosingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminBillingClosing}
      title="Fechamento mensal"
      subtitle="DRE simplificado por competência, recuperação de inadimplência e conciliação de caixa."
      breadcrumbs={[
        { label: "Financeiro", href: ROUTES.adminBilling },
        { label: "Fechamento mensal" },
      ]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminBilling}>Cobranças do mês</Link>
        </Button>
      }
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
          <MonthlyClosingContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
