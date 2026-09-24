import { PortalShell } from "@/components/dashboard/portal-shell";
import { AttendanceHistory } from "@/features/classes/components/attendance-history";
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function DependentAttendancePage({ params }: { params: Promise<{ profileId: string }> }) {
  const [guardian, { profileId }] = await Promise.all([requireCapability("guardian"), params]);
  const history = await getAttendanceHistory(guardian, profileId);
  return <PortalShell profile={guardian} activePath={ROUTES.guardianDependents} title={`Frequência · ${history.profile.full_name}`} subtitle="Acompanhe as chamadas registradas para este aluno."><div className="mx-auto w-full max-w-4xl"><AttendanceHistory entries={history.entries} summary={history.summary} /></div></PortalShell>;
}
