import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { AttendanceHistory } from "@/features/classes/components/attendance-history";
import { AttendanceCalendarSkeleton } from "@/features/classes/components/attendance-calendar-skeleton";
import { currentAttendanceMonth, normalizeAttendanceMonth } from "@/features/classes/attendance-calendar-rules";
import { getAttendanceCalendar } from "@/features/classes/attendance-calendar-service";
import type { Profile } from "@/features/auth/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { ROUTES } from "@/lib/navigation/routes";

async function StudentAttendanceContent({
  profile,
  month
}: {
  profile: Profile;
  month: string;
}) {
  const history = await getAttendanceCalendar(profile, month);
  return (
    <AttendanceHistory
      entries={toClientData(history.entries)}
      summary={history.summary}
      month={month}
      basePath={ROUTES.studentAttendance}
    />
  );
}

export default async function StudentAttendancePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireCapability("student");
  const month = normalizeAttendanceMonth((await searchParams).month, currentAttendanceMonth());

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.studentAttendance}
      title="Minha frequência"
      subtitle="Acompanhe sua assiduidade e o histórico das aulas mês a mês."
    >
      <div className="w-full min-w-0">
        <Suspense key={month} fallback={<AttendanceCalendarSkeleton />}>
          <StudentAttendanceContent profile={profile} month={month} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
