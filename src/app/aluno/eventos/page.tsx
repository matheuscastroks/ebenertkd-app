import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import type { Profile } from "@/features/auth/types";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { StudentEventsView } from "@/features/events/components/student-events-view";
import { getStudentEvents } from "@/features/events/student-events-service";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function StudentEventsContent({ profile }: { profile: Profile }) {
  const data = await getStudentEvents(profile);
  return (
    <StudentEventsView
      hasStudent={Boolean(data.student)}
      studentProfileId={profile.$id}
      returnTo={ROUTES.studentEvents}
      billingHref={ROUTES.studentBilling}
      examsHref={ROUTES.studentExams}
      enrollmentHref={ROUTES.studentEnrollment}
      showFinancial={data.showFinancial}
      viewer={data.minorSelf ? { kind: "minor" } : { kind: "self" }}
      open={toClientData(data.open)}
      upcoming={toClientData(data.upcoming)}
      past={toClientData(data.past)}
    />
  );
}

export default async function StudentEventsPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const [profile, query] = await Promise.all([requireCapability("student"), searchParams]);

  return (
    <PortalShell profile={profile} title="Eventos" subtitle="Campeonatos, aulões, seminários e confraternizações da academia.">
      <div className="w-full min-w-0">
        <EventFeedback ok={query.ok} erro={query.erro} />
        <Suspense fallback={<InlineRowsSkeleton rows={3} label="Carregando eventos…" />}>
          <StudentEventsContent profile={profile} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
