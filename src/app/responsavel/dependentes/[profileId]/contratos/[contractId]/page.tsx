import { PortalShell } from "@/components/dashboard/portal-shell";
import { getContractForActor } from "@/features/contracts/contract-service";
import { ContractWorkspace } from "@/features/contracts/components/contract-workspace";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function DependentContractPage({ params, searchParams }: { params: Promise<{ profileId: string; contractId: string }>; searchParams: Promise<{ signed?: string; requested?: string; error?: string }> }) {
  const guardian = await requireCapability("guardian");
  const [{ profileId, contractId }, query] = await Promise.all([params, searchParams]);
  const { contract, bundle } = await getContractForActor(guardian, contractId);
  if (bundle.student.profile_id !== profileId) throw new Error("contract_profile_mismatch");
  const notice = query.signed ? "Contrato assinado com sucesso." : query.requested ? "Solicitação de cancelamento enviada para análise." : query.error ? "Não foi possível concluir a operação. Revise os dados." : undefined;
  return <PortalShell profile={guardian} activePath={ROUTES.guardianDependents} title="Contrato do dependente" subtitle="Leia com atenção antes de assinar." breadcrumbs={[{ label: "Dependentes", href: ROUTES.guardianDependents }, { label: contract.student_name }, { label: "Contrato" }]}><ContractWorkspace contract={contract} canSign notice={notice} /></PortalShell>;
}
