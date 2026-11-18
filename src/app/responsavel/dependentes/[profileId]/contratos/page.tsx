import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import { listStudentContracts } from "@/features/contracts/contract-service";
import type { Profile } from "@/features/auth/types";
import { DependentContext } from "@/features/families/components/dependent-context";
import { PortalContractList } from "@/features/families/components/portal-contract-list";
import { requireCapability } from "@/lib/auth/session";
import { guardianContractPath, ROUTES } from "@/lib/navigation/routes";

async function DependentContractsList({ guardian, profileId }: { guardian: Profile; profileId: string }) {
  const contracts = await listStudentContracts(guardian, profileId).catch(() => null);
  return <PortalContractList contracts={contracts} canSign hrefFor={(contractId) => guardianContractPath(profileId, contractId)}
    emptyDescription="Quando a matrícula for confirmada pela academia, o contrato aparece aqui para você assinar." />;
}

export default async function DependentContractsPage({ params }: { params: Promise<{ profileId: string }> }) {
  const [guardian, { profileId }] = await Promise.all([requireCapability("guardian"), params]);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      title="Contratos"
      subtitle="Assine contratos pendentes e consulte os já assinados."
      breadcrumbs={[{ label: "Minha família", href: ROUTES.guardian }, { label: "Contratos" }]}
    >
      <DependentContext guardian={guardian} profileId={profileId} section="contratos" />
      <Suspense fallback={<ListItemsSkeleton count={2} />}>
        <DependentContractsList guardian={guardian} profileId={profileId} />
      </Suspense>
    </PortalShell>
  );
}
