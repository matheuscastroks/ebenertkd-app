import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import { listStudentContracts } from "@/features/contracts/contract-service";
import type { Profile } from "@/features/auth/types";
import { PortalContractList } from "@/features/families/components/portal-contract-list";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES, studentContractPath } from "@/lib/navigation/routes";

async function StudentContractsList({ profile }: { profile: Profile }) {
  const contracts = await listStudentContracts(profile).catch(() => null);
  const minor = profile.role === "minor_student";
  return <PortalContractList contracts={contracts} hrefFor={studentContractPath} canSign={!minor}
    emptyDescription={minor ? "Quando a matrícula for confirmada, o contrato aparece aqui para você ler. Quem assina é o seu responsável." : "Quando a matrícula for confirmada pela academia, o contrato aparece aqui para você ler e assinar."} />;
}

export default async function StudentContractsPage() {
  const profile = await requireProfile();
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardianDependents);

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentContracts}
      title="Contratos"
      subtitle={profile.role === "minor_student" ? "Seu contrato de matrícula. Quem assina é o seu responsável." : "Contratos para assinar e documentos já assinados."}
      breadcrumbs={[{ label: "Contratos" }]}
    >
      <Suspense fallback={<ListItemsSkeleton count={2} />}>
        <StudentContractsList profile={profile} />
      </Suspense>
    </PortalShell>
  );
}
