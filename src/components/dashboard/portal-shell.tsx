import type { ReactNode } from "react";
import { DashboardFrame, DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LogoutButton } from "@/components/dashboard/logout-button";
import type { Profile } from "@/features/auth/types";
import { countEnrollmentsRequiringReview } from "@/features/students/service";
import type { BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { navigationForProfile } from "@/lib/navigation/routes";

export async function PortalFrame({ profile, children }: { profile: Profile; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : profile.role === "minor_student" ? "Aluno" : "Aluno adulto";
  const enrollments = profile.role === "admin" ? await countEnrollmentsRequiringReview().catch(() => 0) : undefined;
  return <DashboardFrame badge={badge} profileName={profile.full_name} navItems={navigationForProfile(profile, { enrollments })}>{children}</DashboardFrame>;
}

export function PortalShell({ profile, title, subtitle, breadcrumbs, children }: { profile: Profile; title: string; subtitle: string; activePath: string; breadcrumbs?: BreadcrumbEntry[]; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : profile.role === "minor_student" ? "Aluno" : "Aluno adulto";
  return <DashboardShell title={title} subtitle={subtitle} badge={badge} breadcrumbs={breadcrumbs} headerActions={<LogoutButton />}>{children}</DashboardShell>;
}
