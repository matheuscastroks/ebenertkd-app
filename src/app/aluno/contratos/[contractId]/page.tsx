import { PortalShell } from "@/components/dashboard/portal-shell";
import { getContractForActor } from "@/features/contracts/contract-service";
import { ContractWorkspace } from "@/features/contracts/components/contract-workspace";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { redirect } from "next/navigation";

export default async function StudentContractPage({ params, searchParams }: { params: Promise<{ contractId: string }>; searchParams: Promise<{ signed?: string; requested?: string; error?: string }> }) {
  const actor = await requireProfile();
  const [{ contractId }, query] = await Promise.all([params, searchParams]);
  const { contract, bundle } = await getContractForActor(actor, contractId);
  if (!actor.capabilities.includes("student") || bundle.student.profile_id !== actor.$id) redirect(ROUTES.guardianDependents);
  const notice = query.signed ? "Contrato assinado com sucesso." : query.requested ? "Solicitação de cancelamento enviada para análise." : query.error ? "Não foi possível concluir a operação. Revise os dados." : undefined;
  return <PortalShell profile={actor} activePath={ROUTES.studentContracts} title="Contrato" subtitle="Leia com atenção antes de assinar."><ContractWorkspace contract={contract} canSign={actor.role !== "minor_student"} notice={notice} /></PortalShell>;
}
