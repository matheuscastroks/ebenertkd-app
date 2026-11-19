import { PortalShell } from "@/components/dashboard/portal-shell";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { ContractPolicyForm } from "@/features/academy/components/contract-policy-form";
import { templateUsesCancellationVariables } from "@/features/academy/impact-notes";
import { getPublishedContractVersion } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminAcademyContractsPage() {
  const admin = await requireProfile("admin");
  const [{ policy, revision }, published] = await Promise.all([getPolicyForEdit("contract"), getPublishedContractVersion().catch(() => null)]);
  const templateUsesVariables = published ? templateUsesCancellationVariables(published.content) : null;

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminAcademyContracts}
      title="Contratos da academia"
      subtitle="Regras de vigência, cancelamento e rematrícula que entram nos contratos novos."
      breadcrumbs={[{ label: "Configurações da academia", href: ROUTES.adminAcademy }, { label: "Contratos" }]}
    >
      <div className="w-full">
        <ContractPolicyForm policy={policy} revision={revision} templateUsesVariables={templateUsesVariables} />
      </div>
    </PortalShell>
  );
}
