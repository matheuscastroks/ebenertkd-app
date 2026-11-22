import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import type { Profile } from "@/features/auth/types";
import { getContractForActor } from "@/features/contracts/contract-service";
import { ContractWorkspace } from "@/features/contracts/components/contract-workspace";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function StudentContractBody({
  actor,
  contractId,
  notice,
}: {
  actor: Profile;
  contractId: string;
  notice?: string;
}) {
  const { contract, bundle } = await getContractForActor(actor, contractId);
  if (!actor.capabilities.includes("student") || bundle.student.profile_id !== actor.$id) redirect(ROUTES.guardianDependents);
  return <ContractWorkspace contract={contract} canSign notice={notice} />;
}

export default async function StudentContractPage({ params, searchParams }: { params: Promise<{ contractId: string }>; searchParams: Promise<{ signed?: string; requested?: string; error?: string }> }) {
  const actor = await requireProfile();
  if (actor.role === "minor_student") redirect(ROUTES.studentContracts);
  const [{ contractId }, query] = await Promise.all([params, searchParams]);
  const notice = query.signed ? "Contrato assinado com sucesso." : query.requested ? "Solicitação de cancelamento enviada para análise." : query.error ? "Não foi possível concluir a operação. Revise os dados." : undefined;
  return (
    <PortalShell profile={actor} back={{ label: "Contratos", href: ROUTES.studentContracts }} title="Contrato" subtitle="Leia com atenção antes de assinar.">
      <Suspense fallback={<InlineRowsSkeleton rows={5} label="Carregando contrato…" />}>
        <StudentContractBody actor={actor} contractId={contractId} notice={notice} />
      </Suspense>
    </PortalShell>
  );
}
