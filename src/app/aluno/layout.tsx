import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { PortalFrame } from "@/components/dashboard/portal-shell";
import { getPolicy } from "@/features/academy/config-service";
import { getStudentAppAccessByProfileId } from "@/features/billing/access-lock-service";
import { StudentAccessGate } from "@/features/billing/components/student-access-gate";
import { evaluateParqStatus, type ParqStatus } from "@/features/students/parq-rules";
import { getLatestParqForStudent } from "@/features/students/parq-service";
import { requireProfile } from "@/lib/auth/session";
import { saoPauloToday } from "@/lib/dates";
import { ROUTES } from "@/lib/navigation/routes";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect(ROUTES.admin);
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardian);

  const isMinor = profile.role === "minor_student";
  let locked = false;
  let accessStatus: Parameters<typeof StudentAccessGate>[0]["accessStatus"] = "not_applicable";
  let accessValidUntil: string | null = null;
  let daysRemaining: number | null = null;
  let parqStatus: ParqStatus | null = null;

  try {
    const { studentId, access } = await getStudentAppAccessByProfileId(profile.$id);
    locked = access.locked;
    accessStatus = access.status;
    if (!isMinor) {
      accessValidUntil = access.accessValidUntil;
      daysRemaining = access.daysRemaining;
    }
    if (studentId) {
      const [latestParq, compliance] = await Promise.all([getLatestParqForStudent(studentId).catch(() => null), getPolicy("compliance")]);
      parqStatus = evaluateParqStatus(latestParq, saoPauloToday(), compliance).status;
    }
  } catch {
    // Falha transitória de leitura não deve travar o aluno fora do portal.
    locked = false;
  }

  return (
    <PortalFrame profile={profile}>
      <StudentAccessGate
        isMinor={isMinor}
        locked={locked}
        accessStatus={accessStatus}
        accessValidUntil={accessValidUntil}
        daysRemaining={daysRemaining}
        parqStatus={parqStatus}
      >
        {children}
      </StudentAccessGate>
    </PortalFrame>
  );
}
