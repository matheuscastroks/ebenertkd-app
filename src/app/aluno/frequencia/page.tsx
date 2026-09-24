import { PortalShell } from "@/components/dashboard/portal-shell";
import { AttendanceHistory } from "@/features/classes/components/attendance-history";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentAttendancePage() {
  const profile = await requireCapability("student");
  const history = await getAttendanceHistory(profile);
  return <PortalShell profile={profile} activePath={ROUTES.studentAttendance} title="Minha frequência" subtitle="Acompanhe suas presenças e faltas registradas pelo professor."><div className="mx-auto w-full max-w-4xl"><AttendanceHistory entries={history.entries} summary={history.summary} /></div></PortalShell>;
}
