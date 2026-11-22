import { cache, Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import type { Profile } from "@/features/auth/types";
import { getContractForActor } from "@/features/contracts/contract-service";
import { ContractWorkspace } from "@/features/contracts/components/contract-workspace";
import { requireCapability } from "@/lib/auth/session";
import { guardianContractsPath } from "@/lib/navigation/routes";

const loadContract = cache((guardian: Profile, contractId: string) => getContractForActor(guardian, contractId));

async function DependentContractTitle({ guardian, contractId }: { guardian: Profile; contractId: string }) {
  const { contract } = await loadContract(guardian, contractId);
  return <>Contrato de {contract.student_name}</>;
}

async function DependentContractBody({
  guardian,
  profileId,
  contractId,
  notice,
}: {
  guardian: Profile;
  profileId: string;
  contractId: string;
  notice?: string;
}) {
  const { contract, bundle } = await loadContract(guardian, contractId);
  if (bundle.student.profile_id !== profileId) throw new Error("contract_profile_mismatch");
  return <ContractWorkspace contract={contract} canSign notice={notice} />;
}

export default async function DependentContractPage({ params, searchParams }: { params: Promise<{ profileId: string; contractId: string }>; searchParams: Promise<{ signed?: string; requested?: string; error?: string }> }) {
  const guardian = await requireCapability("guardian");
  const [{ profileId, contractId }, query] = await Promise.all([params, searchParams]);
  const notice = query.signed ? "Contrato assinado com sucesso." : query.requested ? "Solicitação de cancelamento enviada para análise." : query.error ? "Não foi possível concluir a operação. Revise os dados." : undefined;

  return (
    <PortalShell
      profile={guardian}
      back={{ label: "Contratos", href: guardianContractsPath(profileId) }}
      title={
        <Suspense fallback={<InlineValueSkeleton className="h-7 w-48" />}>
          <DependentContractTitle guardian={guardian} contractId={contractId} />
        </Suspense>
      }
      subtitle="Leia com atenção antes de assinar."
    >
      <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando contrato…" />}>
        <DependentContractBody guardian={guardian} profileId={profileId} contractId={contractId} notice={notice} />
      </Suspense>
    </PortalShell>
  );
}
