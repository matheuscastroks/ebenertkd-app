import { cache, Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineCardsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/features/auth/types";
import { listGuardianMinors } from "@/features/families/service";
import { GuardianMinorsOverview } from "@/features/families/components/guardian-overview";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

const loadMinors = cache((guardian: Profile) => listGuardianMinors(guardian));

async function GuardianHeaderAction({ guardian }: { guardian: Profile }) {
  const minors = await loadMinors(guardian);
  if (!minors.length) return null;
  return (
    <Button asChild variant="outline" className="min-h-11">
      <Link href={ROUTES.guardianDependents}>Gerenciar acessos</Link>
    </Button>
  );
}

async function GuardianOverviewLoader({ guardian }: { guardian: Profile }) {
  const minors = await loadMinors(guardian);
  return <GuardianMinorsOverview guardian={guardian} minors={minors} />;
}

export default async function GuardianPage() {
  const guardian = await requireCapability("guardian");
  return (
    <PortalShell
      profile={guardian}
      title="Família"
      subtitle="Próximo treino, frequência e pendências de cada filho em um só lugar."
      headerActions={
        <Suspense fallback={null}>
          <GuardianHeaderAction guardian={guardian} />
        </Suspense>
      }
    >
      <Suspense fallback={<InlineCardsSkeleton count={2} columns={2} label="Carregando dependentes…" />}>
        <GuardianOverviewLoader guardian={guardian} />
      </Suspense>
    </PortalShell>
  );
}
