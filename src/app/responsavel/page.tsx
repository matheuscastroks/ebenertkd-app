import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/skeletons";
import { listGuardianMinors } from "@/features/families/service";
import { GuardianMinorsOverview } from "@/features/families/components/guardian-overview";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  const minors = await listGuardianMinors(guardian);
  return <PortalShell profile={guardian} title="Família" subtitle="Próximo treino, frequência e pendências de cada filho em um só lugar."
    headerActions={minors.length ? <Button asChild variant="outline" className="min-h-11"><Link href={ROUTES.guardianDependents}>Gerenciar acessos</Link></Button> : undefined}>
    <Suspense fallback={<CardGridSkeleton count={Math.max(1, minors.length)} columns={2} />}><GuardianMinorsOverview guardian={guardian} minors={minors} /></Suspense>
  </PortalShell>;
}
