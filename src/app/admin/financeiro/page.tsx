import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { ListPagination } from "@/components/shared/list-pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChargeStatus } from "@/features/billing/types";
import { BillingOverviewChart } from "@/features/billing/components/billing-overview-chart";
import { BillingTable } from "@/features/billing/components/billing-table";
import { BillingFilters, BillingToolbar } from "@/features/billing/components/billing-filters";
import { getBillingOverview, getBillingSummary } from "@/features/billing/report-service";
import { getBillingSettings } from "@/features/billing/settings-service";
import { listTrainingClasses } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const allowedStatuses = new Set<ChargeStatus>([
  "pending",
  "proof_under_review",
  "paid",
  "overdue",
  "cancelled",
]);

type BillingQuery = {
  status?: string;
  competence?: string;
  student?: string;
  trainingClass?: string;
  type?: string;
  error?: string;
  updated?: string;
  page?: string;
};

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<BillingQuery>;
}) {
  const actor = await requireProfile("admin");
  const params = await searchParams;
  const queryKey = JSON.stringify([
    params.status,
    params.competence,
    params.student,
    params.trainingClass,
    params.type,
    params.page,
  ]);

  return (
    <PortalShell
      profile={actor}
      title="Financeiro"
      subtitle="Confira comprovantes, registre pagamentos e acompanhe o mês."
      headerActions={<Suspense fallback={<Skeleton className="h-11 w-32 rounded-lg" />}><BillingToolbarContent /></Suspense>}
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={<MetricCardsSkeleton count={4} />}>
          <BillingMetrics />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-16 w-full rounded-xl" />}>
          <BillingFiltersContent />
        </Suspense>

        {params.error ? (
          <OperationToast
            tone="error"
            title="Não foi possível concluir a operação"
            description="Revise os dados e tente novamente."
            clearParams={["error"]}
          />
        ) : null}
        {params.updated ? (
          <OperationToast
            tone="success"
            title="Operação registrada com sucesso"
            clearParams={["updated"]}
          />
        ) : null}

        <Suspense key={queryKey} fallback={<TableRowsSkeleton columns={5} rows={6} />}>
          <BillingResults params={params} />
        </Suspense>
      </div>
    </PortalShell>
  );
}

async function BillingFiltersContent() {
  const classes = await listTrainingClasses(true);
  return <BillingFilters classes={toClientData(classes)} />;
}

async function BillingToolbarContent() { const settings = await getBillingSettings(); return <BillingToolbar settings={toClientData(settings)} />; }

async function BillingMetrics() {
  const summary = await getBillingSummary();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        <Link
          href={`${ROUTES.adminBilling}?status=paid`}
          className="t-interactive-row block border-r border-b border-border p-4 hover:bg-muted focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:px-5 lg:border-b-0"
          aria-label="Filtrar: Recebido no mês"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
            Recebido no mês
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-success-foreground sm:text-2xl">
            {money(summary.receivedCents)}
          </p>
        </Link>

        <Link
          href={`${ROUTES.adminBilling}?status=pending`}
          className="t-interactive-row block border-b border-border p-4 hover:bg-muted focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:px-5 lg:border-b-0 lg:border-r"
          aria-label="Filtrar: A receber"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            A receber
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
            {money(summary.pendingCents)}
          </p>
        </Link>

        <Link
          href={`${ROUTES.adminBilling}?status=overdue`}
          className="t-interactive-row block border-r border-border p-4 hover:bg-muted focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:px-5"
          aria-label="Filtrar: Em atraso"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span
              className={
                summary.overdueCents > 0
                  ? "size-2 shrink-0 rounded-full bg-destructive"
                  : "size-2 shrink-0 rounded-full bg-muted-foreground"
              }
              aria-hidden="true"
            />
            Em atraso
          </p>
          <p
            className={
              summary.overdueCents > 0
                ? "mt-1 text-xl font-semibold tracking-tight tabular-nums text-destructive sm:text-2xl"
                : "mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl"
            }
          >
            {money(summary.overdueCents)}
          </p>
        </Link>

        <Link
          href={`${ROUTES.adminBilling}?status=proof_under_review`}
          className="t-interactive-row block p-4 hover:bg-muted focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:px-5"
          aria-label="Filtrar: Comprovantes em análise"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden="true" />
            Comprovantes em análise
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-foreground sm:text-2xl">
            {money(summary.underReviewCents)}
          </p>
        </Link>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">Distribuição do mês</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {summary.paidCharges}{" "}
            {summary.paidCharges === 1 ? "pagamento confirmado" : "pagamentos confirmados"} de{" "}
            {summary.distinctPayingStudents}{" "}
            {summary.distinctPayingStudents === 1 ? "aluno" : "alunos"} neste mês.
          </p>
        </div>
        <BillingOverviewChart
          monthlySeries={summary.monthlySeries}
          receivedCents={summary.receivedCents}
          pendingCents={summary.pendingCents}
          overdueCents={summary.overdueCents}
          underReviewCents={summary.underReviewCents}
        />
      </div>
    </div>
  );
}

async function BillingResults({ params }: { params: BillingQuery }) {
  const status = allowedStatuses.has(params.status as ChargeStatus)
    ? (params.status as ChargeStatus)
    : undefined;
  const types = new Set(["monthly_fee", "enrollment_fee", "exam_fee", "exit_fee", "event_fee"] as const);
  const type = types.has(params.type as never)
    ? (params.type as "monthly_fee" | "enrollment_fee" | "exam_fee" | "exit_fee" | "event_fee")
    : undefined;
  const trainingClass = params.trainingClass === "all" ? undefined : params.trainingClass;
  const page = /^\d+$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  const data = await getBillingOverview({
    status,
    competence: /^\d{4}-\d{2}$/.test(params.competence ?? "") ? params.competence : undefined,
    student: params.student,
    trainingClass,
    type,
    page,
  });

  return (
    <div className="space-y-4">
      {data.charges.length === 0 ? (
        <EmptyState
          title="Nenhuma cobrança encontrada"
          description="Remova algum filtro ou consulte outro período."
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href={ROUTES.adminBilling}>Limpar filtros</Link>
            </Button>
          }
        />
      ) : (
        <BillingTable
          charges={toClientData(data.charges)}
          names={data.names}
          photosByStudent={data.photosByStudent}
          proofsByCharge={toClientData(data.proofsByCharge)}
          payments={toClientData(data.payments)}
        />
      )}
      <ListPagination
        basePath={ROUTES.adminBilling}
        params={{
          status: params.status,
          competence: params.competence,
          student: params.student,
          trainingClass: params.trainingClass,
          type: params.type,
        }}
        page={data.pagination.page}
        total={data.pagination.total}
        pageSize={data.pagination.pageSize}
      />
    </div>
  );
}
