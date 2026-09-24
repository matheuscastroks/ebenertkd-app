import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LogoutButton } from "@/components/dashboard/logout-button";
import type { Profile } from "@/features/auth/types";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";
import type { BreadcrumbEntry } from "@/components/shared/page-breadcrumb";
import { ROUTES } from "@/lib/navigation/routes";

function navigation(profile: Profile, activePath: string) {
  const active = (href: string) => href === activePath || activePath.startsWith(`${href}/`);
  if (profile.role === "admin") return [
    { label: "Visão geral", href: ROUTES.admin, icon: "dashboard" as const, group: "Principal" as const, active: activePath === ROUTES.admin },
    { label: "Matrículas", href: ROUTES.adminEnrollments, icon: "students" as const, group: "Alunos" as const, active: active(ROUTES.adminEnrollments) },
    { label: "Turmas e horários", href: ROUTES.adminClasses, icon: "classes" as const, group: "Operação" as const, active: active(ROUTES.adminClasses) },
    { label: "Financeiro", href: ROUTES.adminBilling, icon: "billing" as const, group: "Financeiro" as const, active: active(ROUTES.adminBilling) },
    { label: "Contratos", href: ROUTES.adminContracts, icon: "contracts" as const, group: "Documentos" as const, active: active(ROUTES.adminContracts) }
  ];
  if (profile.role === "guardian") return [
    { label: "Visão geral", href: ROUTES.guardian, icon: "dashboard" as const, active: activePath === ROUTES.guardian },
    { label: "Meus dependentes", href: ROUTES.guardianDependents, icon: "family" as const, active: active(ROUTES.guardianDependents) }
  ];
  if (profile.role === "minor_student") return [
    { label: "Visão geral", href: ROUTES.student, icon: "dashboard" as const, active: activePath === ROUTES.student },
    { label: "Minha matrícula", href: ROUTES.studentEnrollment, icon: "enrollment" as const, active: active(ROUTES.studentEnrollment) },
    { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts" as const, active: active(ROUTES.studentContracts) }
  ];
  const items: AppSidebarNavItem[] = [
    { label: "Visão geral", href: ROUTES.student, icon: "dashboard" as const, active: activePath === ROUTES.student },
    { label: "Minha matrícula", href: ROUTES.studentEnrollment, icon: "enrollment" as const, active: active(ROUTES.studentEnrollment) },
    { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts" as const, active: active(ROUTES.studentContracts) },
    { label: "Financeiro", href: ROUTES.studentBilling, icon: "billing" as const, active: active(ROUTES.studentBilling) }
  ];
  if (profile.capabilities.includes("guardian")) items.push({ label: "Meus dependentes", href: ROUTES.guardianDependents, icon: "family" as const, active: active(ROUTES.guardianDependents) });
  return items;
}

export function PortalShell({ profile, title, subtitle, activePath, breadcrumbs, children }: { profile: Profile; title: string; subtitle: string; activePath: string; breadcrumbs?: BreadcrumbEntry[]; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : profile.role === "minor_student" ? "Aluno" : "Aluno adulto";
  return <DashboardShell title={title} subtitle={subtitle} badge={badge} profileName={profile.full_name} navItems={navigation(profile, activePath)} breadcrumbs={breadcrumbs} headerActions={<LogoutButton />}>{children}</DashboardShell>;
}
