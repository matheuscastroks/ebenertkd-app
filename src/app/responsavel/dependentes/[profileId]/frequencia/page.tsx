import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { AttendanceHistory } from "@/features/classes/components/attendance-history";
import { AttendanceCalendarSkeleton } from "@/features/classes/components/attendance-calendar-skeleton";
import { currentAttendanceMonth, normalizeAttendanceMonth } from "@/features/classes/attendance-calendar-rules";
import { getAttendanceCalendar } from "@/features/classes/attendance-calendar-service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { guardianAttendancePath, ROUTES } from "@/lib/navigation/routes";

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
      profile={guardian}
      activePath={ROUTES.guardianDependents}
      breadcrumbs={[
        { label: "Dependentes", href: ROUTES.guardianDependents },
        { label: "Frequência e Aulas" }
      ]}
      title="Frequência do aluno"
      subtitle="Acompanhe a assiduidade, presenças e histórico de aulas mês a mês."
    >
      <div className="w-full min-w-0">
        <Suspense key={month} fallback={<AttendanceCalendarSkeleton />}>
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
