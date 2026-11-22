import { dependentSegments } from "@/features/families/paths";
import { ROUTES } from "@/lib/navigation/routes";
import { DependentContext } from "@/features/families/components/dependent-context";
import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceHistory } from "@/features/classes/components/attendance-history";
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
        <Suspense
          fallback={
            <div className="space-y-5" role="status" aria-busy="true" aria-label="Carregando calendário">
              <div className="rounded-xl bg-card p-5 shadow-xs">
                <p className="text-sm text-muted-foreground">Frequência no mês</p>
                <Skeleton className="mt-2 h-9 w-28" />
              </div>
              <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs lg:grid-cols-[20rem_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
                <div className="p-5">
                  <p className="font-medium">Calendário de treinos</p>
                  <Skeleton className="mt-4 h-72 w-full" />
                </div>
                <div className="p-5">
                  <p className="font-medium">Detalhes do dia</p>
                  <Skeleton className="mt-4 h-16 w-full" />
                </div>
              </div>
              <span className="sr-only">Carregando calendário…</span>
            </div>
          }
        >
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
