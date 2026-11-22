import { dependentSegments } from "@/features/families/paths";
import { ROUTES } from "@/lib/navigation/routes";
import { DependentContext } from "@/features/families/components/dependent-context";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { StudentExamsView } from "@/features/exams/components/student-exams-view";
import { getStudentExams } from "@/features/exams/student-exams-service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { guardianBillingPath } from "@/lib/navigation/routes";

async function DependentExamsContent({ guardian, profileId }: { guardian: Profile; profileId: string }) {
  const exams = await getStudentExams(guardian, profileId);
  return (
    <StudentExamsView
      hasStudent={Boolean(exams.student)}
      currentRankKey={exams.student?.rank_key}
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
      profile={guardian} back={{ label: "Família", href: ROUTES.guardian }} segments={dependentSegments(profileId)}
      title="Exames"
      subtitle="Exames marcados, taxa de cada um e resultados anteriores."
    >
      <DependentContext guardian={guardian} profileId={profileId} section="exames" />
      <Suspense fallback={<InlineRowsSkeleton rows={2} label="Carregando exames…" />}>
        <DependentExamsContent guardian={guardian} profileId={profileId} />
      </Suspense>
    </PortalShell>
  );
}
