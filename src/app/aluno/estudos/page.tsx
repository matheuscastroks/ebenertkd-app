import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineCardsSkeleton } from "@/components/skeletons";
import type { Profile } from "@/features/auth/types";
import { StudyGuideView } from "@/features/students/components/study-guide-view";
import { resolveStudentRank } from "@/features/students/journey-rules";
import { getStudentJourneySnapshot } from "@/features/students/journey-service";
import { getStudyModulesForRank } from "@/features/students/study-catalog";
import { requireCapability } from "@/lib/auth/session";

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
      title="Faixa"
      subtitle="Revise o Poomsae da sua faixa, comandos em coreano, princípios do Taekwondo e teste seus conhecimentos."
    >
      <div className="w-full min-w-0">
        <Suspense fallback={<InlineCardsSkeleton count={2} columns={2} label="Carregando guia de estudos…" />}>
          <StudentStudiesContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
