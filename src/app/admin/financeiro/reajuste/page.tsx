import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { listAdjustmentCandidates, listTuitionAdjustments } from "@/features/billing/adjustment-service";
import { AdjustmentWizard } from "@/features/billing/components/adjustment-wizard";
import { listFinanceScenarios } from "@/features/billing/planning-service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { formatBusinessDateBr, saoPauloToday } from "@/lib/dates";
import { formatBrl } from "@/lib/money";
import { ROUTES } from "@/lib/navigation/routes";
import { ArrowRight } from "@/components/ui/icons";

const STATUS_LABELS = { draft: "Rascunho", applied: "Confirmado", cancelled: "Cancelada" } as const;
const STATUS_TONES = { draft: "warning", applied: "success", cancelled: "neutral" } as const;

async function AdjustmentContent({ professorName }: { professorName: string }) {
  const [candidates, scenarios, campaigns] = await Promise.all([listAdjustmentCandidates(), listFinanceScenarios(), listTuitionAdjustments()]);

  return (
    <div className="space-y-8">
      {campaigns.length > 0 ? (
        <section aria-labelledby="campaigns-heading" className="space-y-3">
          <h2 id="campaigns-heading" className="text-base font-semibold">Campanhas anteriores</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={STATUS_TONES[campaign.status]}>{STATUS_LABELS[campaign.status]}</StatusBadge>
                    <span className="text-sm">Vigência {formatBusinessDateBr(campaign.effectiveFrom)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {campaign.itemCount} aluno{campaign.itemCount === 1 ? "" : "s"} · {formatBrl(campaign.totalMonthlyImpactCents)} por mês
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="min-h-10">
                  <Link href={`${ROUTES.adminBillingAdjustment}/${campaign.id}`}>
                    Abrir lista de envio
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="new-adjustment-heading" className="space-y-3">
        <h2 id="new-adjustment-heading" className="text-base font-semibold">Nova campanha de reajuste</h2>
        <AdjustmentWizard
          candidates={toClientData(candidates)}
          scenarios={toClientData(scenarios)}
          today={saoPauloToday()}
          professorName={professorName}
        />
      </section>
    </div>
  );
}

export default async function AdminBillingAdjustmentPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminBillingAdjustment}
      title="Reajuste de mensalidade"
      subtitle="Simule o novo valor, veja o impacto no caixa e envie um aviso cordial a cada família."
      breadcrumbs={[
        { label: "Financeiro", href: ROUTES.adminBilling },
        { label: "Reajuste de mensalidade" },
      ]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminBillingCalculator}>Calculadora de metas</Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={4} />
              <TableRowsSkeleton columns={4} rows={5} />
            </div>
          }
        >
          <AdjustmentContent professorName={admin.full_name} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
