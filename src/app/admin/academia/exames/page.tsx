import { PortalShell } from "@/components/dashboard/portal-shell";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { ExamPolicyForm } from "@/features/academy/components/exam-policy-form";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminAcademyExamsPage() {
  const admin = await requireProfile("admin");
  const { policy, revision } = await getPolicyForEdit("exam");

  return (
    <PortalShell
      profile={admin}
      activePath={ROUTES.adminAcademyExams}
      title="Exames da academia"
      subtitle="Taxa padrão, bloqueio por inadimplência, elegibilidade e inscrição em graduações acima."
      breadcrumbs={[{ label: "Configurações da academia", href: ROUTES.adminAcademy }, { label: "Exames" }]}
    >
      <div className="mx-auto w-full max-w-4xl">
        <ExamPolicyForm policy={policy} revision={revision} />
      </div>
    </PortalShell>
  );
}
