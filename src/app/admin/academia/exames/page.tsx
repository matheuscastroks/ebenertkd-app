import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { getPolicyForEdit } from "@/features/academy/config-service";
import { ExamPolicyForm } from "@/features/academy/components/exam-policy-form";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function ExamPolicyLoader() {
  const { policy, revision } = await getPolicyForEdit("exam");
  return <ExamPolicyForm policy={policy} revision={revision} />;
}

export default async function AdminAcademyExamsPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Exames da academia"
      subtitle="Taxa padrão, bloqueio por inadimplência, elegibilidade e inscrição em graduações acima."
    >
      <div className="w-full">
        <Suspense fallback={<InlineRowsSkeleton rows={4} label="Carregando regras de exames…" />}>
          <ExamPolicyLoader />
        </Suspense>
      </div>
    </PortalShell>
  );
}
