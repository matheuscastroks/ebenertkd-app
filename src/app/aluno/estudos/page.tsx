import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { CardGridSkeleton } from "@/components/skeletons";
import type { Profile } from "@/features/auth/types";
import { StudyGuideView } from "@/features/students/components/study-guide-view";
import { resolveStudentRank } from "@/features/students/journey-rules";
import { getStudentJourneySnapshot } from "@/features/students/journey-service";
import { getStudyModulesForRank } from "@/features/students/study-catalog";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function StudentStudiesContent({ profile }: { profile: Profile }) {
  const snapshot = await getStudentJourneySnapshot(profile);
  const currentRankKey = resolveStudentRank(snapshot.student?.rank_key);
  const modules = getStudyModulesForRank(currentRankKey);
  return <StudyGuideView modules={modules} currentRankKey={currentRankKey} />;
}

export default async function StudentStudiesPage() {
  const profile = await requireCapability("student");

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentStudies}
      title="Guia de estudos"
      subtitle="Revise o Poomsae da sua faixa, comandos em coreano, princípios do Taekwondo e teste seus conhecimentos."
      breadcrumbs={[{ label: "Guia de estudos" }]}
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<CardGridSkeleton count={2} columns={2} />}>
          <StudentStudiesContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
