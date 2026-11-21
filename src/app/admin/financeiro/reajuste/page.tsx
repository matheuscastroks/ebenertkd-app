import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge } from "@/components/shared/status-badge";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getAcademyIdentity, getPolicy } from "@/features/academy/config-service";
import { professorSignature } from "@/features/academy/identity-rules";
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

async function AdjustmentContent({ adminName }: { adminName: string }) {
  const [candidates, scenarios, campaigns, identity, billingPolicy] = await Promise.all([listAdjustmentCandidates(), listFinanceScenarios(), listTuitionAdjustments(), getAcademyIdentity(), getPolicy("billing")]);

  const drafts = campaigns.filter((campaign) => campaign.status === "draft");
  const history = campaigns.filter((campaign) => campaign.status !== "draft");

  return (
    <div className="space-y-8">
      {drafts.length > 0 ? <CampaignList id="drafts-heading" title="Em rascunho" items={drafts} /> : null}

      <section aria-labelledby="new-adjustment-heading" className="space-y-3">
        <h2 id="new-adjustment-heading" className="text-base font-semibold">Nova campanha de reajuste</h2>
        <AdjustmentWizard
          candidates={toClientData(candidates)}
          scenarios={toClientData(scenarios)}
          today={saoPauloToday()}
          professorName={professorSignature(identity, adminName)}
          academyName={identity.short_name}
          minNoticeDays={billingPolicy.adjustment_min_notice_days}
        />
      </section>

      {history.length > 0 ? <CampaignList id="campaigns-heading" title="Campanhas anteriores" items={history} /> : null}
    </div>
  );
}

type Campaign = Awaited<ReturnType<typeof listTuitionAdjustments>>[number];

function CampaignList({ id, title, items }: { id: string; title: string; items: Campaign[] }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-base font-semibold">{title}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs">
        {items.map((campaign) => (
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
  );
}

export default async function AdminBillingAdjustmentPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      title="Financeiro"
      subtitle="Simule o novo valor, veja o impacto no caixa e avise cada família."
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
          <AdjustmentContent adminName={admin.full_name} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
