import { dependentSegments } from "@/features/families/paths";
import { ROUTES } from "@/lib/navigation/routes";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { listStudentContracts } from "@/features/contracts/contract-service";
import type { Profile } from "@/features/auth/types";
import { DependentContext } from "@/features/families/components/dependent-context";
import { PortalContractList } from "@/features/families/components/portal-contract-list";
import { requireCapability } from "@/lib/auth/session";
import { guardianContractPath } from "@/lib/navigation/routes";

async function DependentContractsList({ guardian, profileId }: { guardian: Profile; profileId: string }) {
  const contracts = await listStudentContracts(guardian, profileId).catch(() => null);
  return <PortalContractList contracts={contracts} canSign hrefFor={(contractId) => guardianContractPath(profileId, contractId)}
    emptyDescription="Quando a matrícula for confirmada pela academia, o contrato aparece aqui para você assinar." />;
}

export default async function DependentContractsPage({ params }: { params: Promise<{ profileId: string }> }) {
  const [guardian, { profileId }] = await Promise.all([requireCapability("guardian"), params]);

  return (
    <PortalShell
      profile={guardian} back={{ label: "Família", href: ROUTES.guardian }} segments={dependentSegments(profileId)}
      title="Contratos"
      subtitle="Assine contratos pendentes e consulte os já assinados."
    >
      <DependentContext guardian={guardian} profileId={profileId} section="contratos" />
      <Suspense fallback={<InlineRowsSkeleton rows={2} label="Carregando contratos…" />}>
        <DependentContractsList guardian={guardian} profileId={profileId} />
      </Suspense>
    </PortalShell>
  );
}
