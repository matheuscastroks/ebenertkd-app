import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import { StudentExamsView } from "@/features/exams/components/student-exams-view";
import { getStudentExams } from "@/features/exams/student-exams-service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { guardianBillingPath, ROUTES } from "@/lib/navigation/routes";

async function DependentExamsContent({ guardian, profileId }: { guardian: Profile; profileId: string }) {
  const exams = await getStudentExams(guardian, profileId);
  return (
    <StudentExamsView
      hasStudent={Boolean(exams.student)}
      currentBelt={exams.student?.current_belt}
      currentGub={exams.student?.gub}
      upcoming={toClientData(exams.upcoming)}
      past={toClientData(exams.past)}
      showFinancial={exams.showFinancial}
      billingHref={guardianBillingPath(profileId)}
    />
  );
}

export default async function DependentExamsPage({ params }: { params: Promise<{ profileId: string }> }) {
  const [guardian, { profileId }] = await Promise.all([requireCapability("guardian"), params]);

  return (
    <PortalShell
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      breadcrumbs={[
        { label: "Dependentes", href: ROUTES.guardianDependents },
        { label: "Exames de faixa" }
      ]}
      title="Exames do aluno"
      subtitle="Veja os exames de faixa agendados, a taxa de cada um e os resultados anteriores."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<ListItemsSkeleton count={2} />}>
          <DependentExamsContent guardian={guardian} profileId={profileId} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
