import { dependentSegments } from "@/features/families/paths";
import { ROUTES } from "@/lib/navigation/routes";
import { DependentContext } from "@/features/families/components/dependent-context";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { AttendanceHistory } from "@/features/classes/components/attendance-history";
import { AttendanceCalendarSkeleton } from "@/features/classes/components/attendance-calendar-skeleton";
import { currentAttendanceMonth, normalizeAttendanceMonth } from "@/features/classes/attendance-calendar-rules";
import { getAttendanceCalendar } from "@/features/classes/attendance-calendar-service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { guardianAttendancePath } from "@/lib/navigation/routes";

async function DependentAttendanceContent({
  guardian,
  profileId,
  month
}: {
  guardian: Profile;
  profileId: string;
  month: string;
}) {
  const history = await getAttendanceCalendar(guardian, month, profileId);
  return (
    <AttendanceHistory
      entries={toClientData(history.entries)}
      summary={history.summary}
      month={month}
      basePath={guardianAttendancePath(profileId)}
    />
  );
}

export default async function DependentAttendancePage({
  params,
  searchParams
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [guardian, { profileId }, query] = await Promise.all([
    requireCapability("guardian"),
    params,
    searchParams
  ]);

  const month = normalizeAttendanceMonth(query.month, currentAttendanceMonth());

  return (
    <PortalShell
      profile={guardian} back={{ label: "Família", href: ROUTES.guardian }} segments={dependentSegments(profileId)}
      title="Frequência"
      subtitle="Presenças e aulas do dependente, mês a mês."
    >
      <div className="w-full min-w-0 space-y-6">
        <DependentContext guardian={guardian} profileId={profileId} section="frequencia" />
        <Suspense fallback={<AttendanceCalendarSkeleton />}>
          <DependentAttendanceContent
            guardian={guardian}
            profileId={profileId}
            month={month}
          />
        </Suspense>
      </div>
    </PortalShell>
  );
}
