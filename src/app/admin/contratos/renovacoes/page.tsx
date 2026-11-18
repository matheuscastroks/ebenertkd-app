import Link from "next/link";
import { Suspense } from "react";
import { quickRenewContractAction } from "@/app/actions/renewals";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { DateField } from "@/components/shared/date-field";
import { EmptyState } from "@/components/shared/empty-state";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { OperationToast } from "@/components/shared/operation-toast";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { RenewalFilters } from "@/features/contracts/components/renewal-filters";
import { RenewalPipelineChart } from "@/features/contracts/components/renewal-pipeline-chart";
import { getContractRenewalPipeline } from "@/features/contracts/renewal-service";
import type { RenewalBucket } from "@/features/contracts/rules";
import { requireProfile } from "@/lib/auth/session";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { adminEnrollmentPath, ROUTES } from "@/lib/navigation/routes";
import { ArrowRight, RefreshCw } from "@/components/ui/icons";

const BUCKET_LABELS: Record<RenewalBucket, string> = {
  expired: "Vencido",
  due_7d: "Vence em ≤ 7 dias",
  due_30d: "Vence em 8–30 dias",
  due_60d: "Vence em 31–60 dias",
  due_90d: "Vence em 61–90 dias",
  healthy: "Vigente (> 90 dias)",
};

const BUCKET_TONES: Record<RenewalBucket, StatusTone> = {
  expired: "danger",
  due_7d: "warning",
  due_30d: "info",
  due_60d: "neutral",
  due_90d: "neutral",
  healthy: "success",
};

const allowedBuckets = new Set<RenewalBucket>([
  "expired",
  "due_7d",
  "due_30d",
  "due_60d",
  "due_90d",
  "healthy",
]);

type SearchParams = Promise<{
  q?: string;
  bucket?: string;
  updated?: string;
  error?: string;
}>;

async function RenewalsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const bucket = allowedBuckets.has(params.bucket as RenewalBucket)
    ? (params.bucket as RenewalBucket)
    : undefined;

  const data = await getContractRenewalPipeline({
    bucket,
    search: params.q,
  });

  const { summary, buckets, rows } = data;

  return (
    <div className="space-y-6">
      <dl
        aria-label="Resumo da esteira de renovações"
        className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-4 sm:divide-x sm:divide-y-0"
      >
        <Link
          href={`${ROUTES.adminContractRenewals}?bucket=expired`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
            Contratos vencidos
          </dt>
          <dd
            className={
              summary.expiredCount > 0
                ? "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-destructive"
                : "mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground"
            }
          >
            {summary.expiredCount}
          </dd>
          <p className="text-xs text-muted-foreground">aguardando novo termo</p>
        </Link>

        <Link
          href={`${ROUTES.adminContractRenewals}?bucket=due_30d`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            Vencem em até 30d
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.due30dCount}
          </dd>
          <p className="text-xs text-muted-foreground">janela prioritária de renovação</p>
        </Link>

        <Link
          href={`${ROUTES.adminContractRenewals}?bucket=due_60d`}
          className="t-interactive-row block p-4 hover:bg-muted sm:px-5"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-info" aria-hidden="true" />
            Vencem em 31–90d
          </dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {summary.due60to90dCount}
          </dd>
          <p className="text-xs text-muted-foreground">previsão de médio prazo</p>
        </Link>

        <div className="p-4 sm:px-5">
          <dt className="text-sm font-medium text-muted-foreground">Receita mensal em janela (≤30d)</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatBrl(summary.revenueAtRisk30dCents)}
          </dd>
          <p className="text-xs text-muted-foreground tabular-nums">
            {summary.totalSigned} contratos assinados no total
          </p>
        </div>
      </dl>

      <RenewalPipelineChart buckets={buckets} />

      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum contrato nesta janela"
          description="Não há contratos vencidos ou próximos do vencimento para os filtros atuais."
          action={
            <Button asChild variant="outline" className="min-h-11">
              <Link href={ROUTES.adminContractRenewals}>Ver janela padrão (90 dias)</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="renewals-list-heading" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="renewals-list-heading" className="text-base font-semibold">
              Contratos na esteira ({rows.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Ao renovar, o sistema emite a versão mais recente do modelo para assinatura digital.
            </p>
          </div>

          <ul className="t-stagger divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {rows.map((item) => (
              <li
                key={item.contractId}
                className="t-interactive-row flex flex-col gap-3 px-4 py-4 hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.studentName}
                    </p>
                    <StatusBadge tone={BUCKET_TONES[item.bucket]}>
                      {BUCKET_LABELS[item.bucket]}
                    </StatusBadge>
                    {item.enrollmentStatus === "awaiting_signature" ? (
                      <StatusBadge tone="info">Novo termo aguardando assinatura</StatusBadge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vigência atual:{" "}
                    <span className="tabular-nums">
                      {formatBusinessDateBr(item.startsAt)} até {formatBusinessDateBr(item.endsAt)}
                    </span>
                    {" · "}
                    Mensalidade:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatBrl(item.monthlyFeeCents)}
                    </span>
                    {item.guardianName ? ` · Responsável: ${item.guardianName}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  {item.enrollmentStatus !== "awaiting_signature" ? (
                    <ResponsiveDialog
                      trigger={
                        <Button size="sm" variant="default" className="min-h-10">
                          <RefreshCw className="size-3.5" aria-hidden="true" />
                          Renovar contrato
                        </Button>
                      }
                      title={`Renovar contrato · ${item.studentName}`}
                      description="Defina a data final da nova vigência. O termo será enviado automaticamente para assinatura."
                    >
                      <form action={quickRenewContractAction} className="space-y-4 pt-2">
                        <input type="hidden" name="student_id" value={item.studentId} />
                        <DateField
                          id={`renew-end-${item.studentId}`}
                          name="ends_at"
                          label="Novo término de vigência"
                          defaultValue={item.suggestedNextEnd}
                          required
                        />
                        <FormSubmitButton className="min-h-11 w-full" pendingLabel="Emitindo novo contrato…">
                          Emitir renovação para assinatura
                        </FormSubmitButton>
                      </form>
                    </ResponsiveDialog>
                  ) : null}

                  <Button asChild size="sm" variant="outline" className="min-h-10">
                    <Link href={adminEnrollmentPath(item.studentId)}>
                      Ficha do aluno
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default async function AdminContractRenewalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [admin, params] = await Promise.all([requireProfile("admin"), searchParams]);

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminContractRenewals}
      title="Esteira de renovações"
      subtitle="Acompanhe contratos vencidos ou próximos do término nos próximos 90 dias e emita renovações."
      breadcrumbs={[
        { label: "Contratos", href: ROUTES.adminContracts },
        { label: "Renovações" },
      ]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminContracts}>Voltar para contratos</Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        {params.updated === "renewal" ? (
          <OperationToast
            tone="success"
            title="Contrato renovado e enviado"
            description="O novo contrato foi gerado e aguarda a assinatura no portal."
            clearParams={["updated"]}
          />
        ) : null}
        {params.error === "renewal" ? (
          <OperationToast
            tone="error"
            title="Não foi possível renovar o contrato"
            description="Verifique se há um modelo publicado e se a nova data é posterior à vigência atual."
            clearParams={["error"]}
          />
        ) : null}

        <Suspense fallback={null}>
          <RenewalFilters />
        </Suspense>

        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <TableRowsSkeleton columns={4} rows={5} />
            </div>
          }
        >
          <RenewalsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
