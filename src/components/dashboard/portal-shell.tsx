import type { ReactNode } from "react";
import { DashboardFrame, DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Profile } from "@/features/auth/types";
import { countEnrollmentsRequiringReview } from "@/features/students/service";
import { countUnreadNotifications } from "@/features/notifications/notification-service";
import type { BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { navigationForProfile } from "@/lib/navigation/routes";

export async function PortalFrame({ profile, children }: { profile: Profile; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  const [enrollments, notifications] = await Promise.all([profile.role === "admin" ? countEnrollmentsRequiringReview().catch(() => 0) : Promise.resolve(undefined), countUnreadNotifications(profile).catch(() => 0)]);
  return <DashboardFrame badge={badge} profileName={profile.full_name} navItems={navigationForProfile(profile, { enrollments, notifications })}>{children}</DashboardFrame>;
}

export function PortalShell({ profile, title, subtitle, breadcrumbs, children }: { profile: Profile; title: string; subtitle: string; activePath: string; breadcrumbs?: BreadcrumbEntry[]; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : "Aluno";
  return <DashboardShell title={title} subtitle={subtitle} badge={badge} breadcrumbs={breadcrumbs}>{children}</DashboardShell>;
}
