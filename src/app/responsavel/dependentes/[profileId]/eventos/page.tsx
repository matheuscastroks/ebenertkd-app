import { dependentSegments } from "@/features/families/paths";
import { ROUTES } from "@/lib/navigation/routes";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { ListItemsSkeleton } from "@/components/skeletons";
import type { Profile } from "@/features/auth/types";
import { EventFeedback } from "@/features/events/components/event-feedback";
import { StudentEventsView } from "@/features/events/components/student-events-view";
import { getStudentEvents } from "@/features/events/student-events-service";
import { DependentContext } from "@/features/families/components/dependent-context";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { guardianBillingPath, guardianEnrollmentPath, guardianEventsPath, guardianExamsPath } from "@/lib/navigation/routes";

async function DependentEventsContent({ guardian, profileId }: { guardian: Profile; profileId: string }) {
  const data = await getStudentEvents(guardian, profileId);
  return (
    <StudentEventsView
      hasStudent={Boolean(data.student)}
      studentProfileId={profileId}
      returnTo={guardianEventsPath(profileId)}
      billingHref={guardianBillingPath(profileId)}
      examsHref={guardianExamsPath(profileId)}
      enrollmentHref={guardianEnrollmentPath(profileId)}
      showFinancial={data.showFinancial}
      viewer={{ kind: "guardian", dependentName: data.profile.full_name }}
      open={toClientData(data.open)}
      upcoming={toClientData(data.upcoming)}
      past={toClientData(data.past)}
    />
  );
}

export default async function DependentEventsPage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const [guardian, { profileId }, query] = await Promise.all([requireCapability("guardian"), params, searchParams]);

  return (
    <PortalShell
      profile={guardian} back={{ label: "Família", href: ROUTES.guardian }} segments={dependentSegments(profileId)}
      title="Eventos"
      subtitle="Inscreva o dependente, autorize campeonatos, envie documentos e acompanhe os pagamentos."
    >
      <DependentContext guardian={guardian} profileId={profileId} section="eventos" />
      <EventFeedback ok={query.ok} erro={query.erro} />
      <Suspense fallback={<ListItemsSkeleton count={3} />}>
        <DependentEventsContent guardian={guardian} profileId={profileId} />
      </Suspense>
    </PortalShell>
  );
}
