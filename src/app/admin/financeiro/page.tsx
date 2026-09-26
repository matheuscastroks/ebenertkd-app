import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { OperationToast } from "@/components/shared/operation-toast";
import { ListPagination } from "@/components/shared/list-pagination";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChargeStatus } from "@/features/billing/types";
import { BillingTable } from "@/features/billing/components/billing-table";
import { BillingFilters } from "@/features/billing/components/billing-filters";
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
      activePath={ROUTES.adminBilling}
      title="Painel financeiro"
      subtitle="Acompanhe mensalidades, conciliação de PIX e conferência de comprovantes."
      breadcrumbs={[{ label: "Financeiro" }]}
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense fallback={<MetricCardsSkeleton count={4} />}>
          <BillingMetrics />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
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
  const [classes, settings] = await Promise.all([listTrainingClasses(true), getBillingSettings()]);
  return <BillingFilters classes={toClientData(classes)} settings={toClientData(settings)} />;
}

async function BillingMetrics() {
  const summary = await getBillingSummary();
  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recebido no mês" value={money(summary.receivedCents)} tone="success" />
        <MetricCard label="A receber" value={money(summary.pendingCents)} tone="warning" />
        <MetricCard label="Em atraso" value={money(summary.overdueCents)} tone="danger" />
        <MetricCard label="Comprovantes em análise" value={money(summary.underReviewCents)} tone="info" />
      </div>
      <p className="text-xs text-muted-foreground">
        {summary.paidCharges}{" "}
        {summary.paidCharges === 1 ? "pagamento confirmado" : "pagamentos confirmados"} de{" "}
        {summary.distinctPayingStudents}{" "}
        {summary.distinctPayingStudents === 1 ? "aluno" : "alunos"} neste mês.
      </p>
    </div>
  );
}

async function BillingResults({ params }: { params: BillingQuery }) {
  const status = allowedStatuses.has(params.status as ChargeStatus)
    ? (params.status as ChargeStatus)
    : undefined;
  const types = new Set(["monthly_fee", "enrollment_fee", "exam_fee", "exit_fee"] as const);
  const type = types.has(params.type as never)
    ? (params.type as "monthly_fee" | "enrollment_fee" | "exam_fee" | "exit_fee")
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
          description="Ajuste os filtros para consultar outro período ou grupo de alunos."
          action={
            <Button asChild variant="outline">
              <Link href={ROUTES.adminBilling}>Limpar filtros</Link>
            </Button>
          }
        />
      ) : (
        <BillingTable
          charges={data.charges}
          names={data.names}
          photosByStudent={data.photosByStudent}
          proofsByCharge={data.proofsByCharge}
          payments={data.payments}
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
