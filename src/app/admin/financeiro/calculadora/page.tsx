import Link from "next/link";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { PlanningCalculator } from "@/features/billing/components/planning-calculator";
import { getPlanningBaseline, listFinanceScenarios } from "@/features/billing/planning-service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function CalculatorContent() {
  const [baseline, scenarios, billing] = await Promise.all([getPlanningBaseline(), listFinanceScenarios(), getPolicyForEdit("billing")]);
  return <PlanningCalculator baseline={toClientData(baseline)} scenarios={toClientData(scenarios)} defaultFee={{ cents: billing.policy.default_monthly_fee_cents, revision: billing.revision }} />;
}

export default async function AdminBillingCalculatorPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminBillingCalculator}
      title="Calculadora de metas"
      subtitle="Descubra quanto cobrar, quantos alunos você precisa e o que muda se algo mudar no mês."
      breadcrumbs={[
        { label: "Financeiro", href: ROUTES.adminBilling },
        { label: "Calculadora de metas" },
      ]}
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminBillingAdjustment}>Reajuste de mensalidade</Link>
        </Button>
      }
    >
      <div className="w-full min-w-0 space-y-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricCardsSkeleton count={3} />
              <TableRowsSkeleton columns={3} rows={4} />
            </div>
          }
        >
          <CalculatorContent />
        </Suspense>
      </div>
    </PortalShell>
  );
}
