import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import { StudentExamsView } from "@/features/exams/components/student-exams-view";
import { getStudentExams } from "@/features/exams/student-exams-service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function StudentExamsContent({ profile }: { profile: Profile }) {
  const exams = await getStudentExams(profile);
  return (
    <StudentExamsView
      hasStudent={Boolean(exams.student)}
      currentBelt={exams.student?.current_belt}
      currentGub={exams.student?.gub}
      upcoming={toClientData(exams.upcoming)}
      past={toClientData(exams.past)}
      showFinancial={exams.showFinancial}
      billingHref={ROUTES.studentBilling}
    />
  );
}

export default async function StudentExamsPage() {
  const profile = await requireCapability("student");

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentExams}
      title="Meus exames"
      subtitle="Acompanhe seus exames de faixa agendados e os resultados anteriores."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<ListItemsSkeleton count={2} />}>
          <StudentExamsContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
