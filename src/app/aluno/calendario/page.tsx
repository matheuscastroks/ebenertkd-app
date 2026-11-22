import { Suspense } from "react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/features/auth/types";
import { CheckInSection } from "@/features/classes/components/check-in-section";
import { MonthlyAgenda } from "@/features/classes/components/monthly-agenda";
import { currentAttendanceMonth, normalizeAttendanceMonth } from "@/features/classes/attendance-calendar-rules";
import { getAttendanceCalendar } from "@/features/classes/attendance-calendar-service";
import { buildAttendanceEvolution } from "@/features/classes/attendance-evolution";
import { mergeAgendaTraining } from "@/features/classes/monthly-agenda-rules";
import { getStudentCalendarData } from "@/features/classes/student-calendar-service";
import type { AttendanceCalendarEntry } from "@/features/classes/types";
import { requireCapability } from "@/lib/auth/session";
import { toClientData } from "@/lib/client-data";
import { saoPauloToday } from "@/lib/dates";

function AgendaSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Carregando agenda">
    <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
    <Skeleton className="h-28 rounded-xl" />
  </div>;
}

async function StudentAgendaContent({ profile, month }: { profile: Profile; month: string }) {
  const [calendar, history] = await Promise.all([getStudentCalendarData(profile, month), getAttendanceCalendar(profile, month)]);
  const entries = new Map<string, AttendanceCalendarEntry>();
  for (const lesson of calendar.lessons) entries.set(lesson.$id, { lesson, trainingClass: calendar.trainingClass ?? undefined });
  for (const entry of history.entries) entries.set(entry.lesson.$id, entry);
  const training = mergeAgendaTraining(calendar.sessions, [...entries.values()]);
  const trainingClass = calendar.trainingClass ? {
    $id: calendar.trainingClass.$id, name: calendar.trainingClass.name, weekdays: calendar.trainingClass.weekdays,
    start_time: calendar.trainingClass.start_time, end_time: calendar.trainingClass.end_time, location: calendar.trainingClass.location
  } : null;
  const recorded = history.entries.filter((entry) => entry.lesson.status !== "cancelled");
  return <MonthlyAgenda month={month} today={saoPauloToday()} now={new Date().toISOString()}
    training={toClientData(training)} events={toClientData(calendar.monthEvents)} trainingClass={toClientData(trainingClass)}
    frequency={{ ...history.summary, absent: recorded.filter((entry) => entry.record?.status === "absent").length, excused: recorded.filter((entry) => entry.record?.status === "excused").length, points: buildAttendanceEvolution(history.entries) }}
  />;
}

export default async function StudentCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [profile, query] = await Promise.all([requireCapability("student"), searchParams]);
  const month = normalizeAttendanceMonth(query.month, currentAttendanceMonth());
  return <PortalShell profile={profile} title="Agenda" subtitle="Treinos, eventos e frequência no mesmo calendário.">
    <div className="w-full min-w-0 space-y-6">
      <Suspense fallback={null}><CheckInSection profile={profile} /></Suspense>
      <Suspense key={month} fallback={<AgendaSkeleton />}><StudentAgendaContent profile={profile} month={month} /></Suspense>
    </div>
  </PortalShell>;
}
