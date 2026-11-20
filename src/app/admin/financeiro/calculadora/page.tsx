import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { MetricCardsSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { PlanningCalculator } from "@/features/billing/components/planning-calculator";
import { getPlanningBaseline, listFinanceScenarios } from "@/features/billing/planning-service";
import { requireProfile } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";

async function CalculatorContent() {
  const [baseline, scenarios, billing] = await Promise.all([getPlanningBaseline(), listFinanceScenarios(), getPolicyForEdit("billing")]);
  return <PlanningCalculator baseline={toClientData(baseline)} scenarios={toClientData(scenarios)} defaultFee={{ cents: billing.policy.default_monthly_fee_cents, revision: billing.revision }} />;
}

export default async function AdminBillingCalculatorPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      title="Financeiro"
      subtitle="Simule quanto cobrar e quantos alunos você precisa."
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
