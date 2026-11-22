import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Profile } from "@/features/auth/types";
import type { BackTarget } from "@/components/dashboard/section-nav";
import type { NavSegment } from "@/lib/navigation/routes";

export function PortalShell({ profile, title, subtitle, back, segments, headerActions, children }: { profile: Profile; title: ReactNode; subtitle: ReactNode; back?: BackTarget; segments?: NavSegment[]; headerActions?: ReactNode; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  return <DashboardShell title={title} subtitle={subtitle} badge={badge} back={back} segments={segments} headerActions={headerActions}>{children}</DashboardShell>;
}
