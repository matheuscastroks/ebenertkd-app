import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LogoutButton } from "@/components/dashboard/logout-button";
import type { Profile } from "@/features/auth/types";
import type { AppSidebarNavItem } from "@/components/dashboard/app-sidebar";

function navigation(profile: Profile, activePath: string) {
  const active = (href: string) => href === activePath || activePath.startsWith(`${href}/`);
  if (profile.role === "admin") return [
    { label: "Visão geral", href: "/admin", icon: "dashboard" as const, active: activePath === "/admin" },
    { label: "Matrículas", href: "/admin/alunos", icon: "students" as const, active: active("/admin/alunos") },
    { label: "Turmas e horários", href: "/admin/turmas", icon: "classes" as const, active: active("/admin/turmas") }
  ];
  if (profile.role === "guardian") return [
    { label: "Meus dependentes", href: "/responsavel", icon: "family" as const, active: active("/responsavel") },
    { label: "Fichas de matrícula", href: "/matricula", icon: "enrollment" as const, active: active("/matricula") }
  ];
  if (profile.role === "minor_student") return [
    { label: "Visão geral", href: "/menor", icon: "dashboard" as const, active: active("/menor") },
    { label: "Minha matrícula", href: "/matricula", icon: "enrollment" as const, active: active("/matricula") }
  ];
  const items: AppSidebarNavItem[] = [
    { label: "Visão geral", href: "/aluno", icon: "dashboard" as const, active: active("/aluno") },
    { label: "Minha matrícula", href: "/matricula", icon: "enrollment" as const, active: active("/matricula") }
  ];
  if (profile.capabilities.includes("guardian")) items.push({ label: "Meus dependentes", href: "/responsavel", icon: "family" as const, active: active("/responsavel") });
  return items;
}

export function PortalShell({ profile, title, subtitle, activePath, children }: { profile: Profile; title: string; subtitle: string; activePath: string; children: ReactNode }) {
  const badge = profile.role === "admin" ? "Professor" : profile.role === "guardian" ? "Responsável" : profile.role === "minor_student" ? "Aluno" : "Aluno adulto";
  return <DashboardShell title={title} subtitle={subtitle} badge={badge} navItems={navigation(profile, activePath)} asideTitle="Ebenert KD" asideCopy="Gestão de matrículas, turmas e rotina da academia em um só lugar." headerActions={<LogoutButton />}>{children}</DashboardShell>;
}
