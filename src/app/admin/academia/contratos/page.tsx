import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { ContractPolicyForm } from "@/features/academy/components/contract-policy-form";
import { templateUsesCancellationVariables } from "@/features/academy/impact-notes";
import { getPublishedContractVersion } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function ContractPolicyLoader() {
  const [{ policy, revision }, published] = await Promise.all([getPolicyForEdit("contract"), getPublishedContractVersion().catch(() => null)]);
  const templateUsesVariables = published ? templateUsesCancellationVariables(published.content) : null;
  return <ContractPolicyForm policy={policy} revision={revision} templateUsesVariables={templateUsesVariables} />;
}

export default async function AdminAcademyContractsPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Contratos da academia"
      subtitle="Regras de vigência, cancelamento e rematrícula que entram nos contratos novos."
    >
      <div className="w-full">
        <Suspense fallback={<InlineRowsSkeleton rows={4} label="Carregando regras de contrato…" />}>
          <ContractPolicyLoader />
        </Suspense>
      </div>
    </PortalShell>
  );
}
