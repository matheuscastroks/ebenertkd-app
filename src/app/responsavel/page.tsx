import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/skeletons";
import { listGuardianMinors } from "@/features/families/service";
import { GuardianMinorsOverview } from "@/features/families/components/guardian-overview";
import { OnboardingTrigger } from "@/features/onboarding/components/onboarding-trigger";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian);
  return <PortalShell profile={guardian} activePath={ROUTES.guardian} title="Meus dependentes" subtitle="Treinos, frequência e pagamentos da família."
    headerActions={<Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.guardianDependents}>Adicionar dependente</Link></Button>}>
    <div className="space-y-4">
      <Suspense fallback={null}><OnboardingTrigger role="guardian" userName={guardian.full_name} hasCompletedOnboarding={Boolean(guardian.onboarding_completed_at)} /></Suspense>
      <Suspense fallback={<CardGridSkeleton count={2} columns={2} />}><GuardianMinorsOverview guardian={guardian} minors={minors} /></Suspense>
    </div>
  </PortalShell>;
}
