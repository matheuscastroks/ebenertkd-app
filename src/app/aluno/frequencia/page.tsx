import { redirect } from "next/navigation";
import { currentAttendanceMonth, normalizeAttendanceMonth } from "@/features/classes/attendance-calendar-rules";
import { requireCapability } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

/** Preserva links antigos e o mês solicitado na agenda unificada. */
export default async function StudentAttendancePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireCapability("student");
  const month = normalizeAttendanceMonth((await searchParams).month, currentAttendanceMonth());
  redirect(`${ROUTES.studentCalendar}?month=${month}#frequencia`);
}
