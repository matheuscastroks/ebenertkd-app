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
  return <PortalShell profile={guardian} activePath={ROUTES.guardian} title="Minha família" subtitle="O que está pendente e o próximo treino de cada filho."
    headerActions={minors.length ? <Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.guardianDependents}>Gerenciar dependentes</Link></Button> : undefined}>
    <Suspense fallback={null}><OnboardingTrigger role="guardian" userName={guardian.full_name} hasCompletedOnboarding={Boolean(guardian.onboarding_completed_at)} /></Suspense>
    <Suspense fallback={<CardGridSkeleton count={Math.max(1, minors.length)} columns={2} />}><GuardianMinorsOverview guardian={guardian} minors={minors} /></Suspense>
  </PortalShell>;
}
