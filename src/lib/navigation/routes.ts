import type { Profile } from "@/features/auth/types";

export const ROUTES = {
  home: "/",
  admin: "/admin",
  adminEnrollments: "/admin/matriculas",
  adminClasses: "/admin/turmas",
  adminExams: "/admin/exames",
  studentAttendance: "/aluno/frequencia",
  adminContracts: "/admin/contratos",
  adminContractTemplate: "/admin/contratos/modelo",
  adminCancellations: "/admin/contratos/cancelamentos",
  adminBilling: "/admin/financeiro",
  adminBillingSettings: "/admin/financeiro/configuracoes",
  student: "/aluno",
  studentEnrollment: "/aluno/matricula",
  studentContracts: "/aluno/contratos",
  studentBilling: "/aluno/financeiro",
  guardian: "/responsavel",
  guardianDependents: "/responsavel/dependentes"
} as const;

export type SidebarNavIcon = "dashboard" | "enrollment" | "students" | "classes" | "exams" | "attendance" | "family" | "contracts" | "billing";
export type SidebarNavGroup = "Principal" | "Alunos" | "Operação" | "Financeiro" | "Documentos";

export type SidebarNavItem = {
  label: string;
  href: string;
  active?: boolean;
  exact?: boolean;
  badge?: number;
  group?: SidebarNavGroup;
  icon?: SidebarNavIcon;
  children?: SidebarNavItem[];
};

export function navigationForProfile(profile: Pick<Profile, "role" | "capabilities">, counts: { enrollments?: number } = {}): SidebarNavItem[] {
  if (profile.role === "admin") return [
    { label: "Visão geral", href: ROUTES.admin, exact: true, icon: "dashboard", group: "Principal" },
    { label: "Matrículas", href: ROUTES.adminEnrollments, icon: "students", group: "Alunos", badge: counts.enrollments },
    { label: "Turmas e horários", href: ROUTES.adminClasses, icon: "classes", group: "Operação" },
    { label: "Exames de faixa", href: ROUTES.adminExams, icon: "exams", group: "Operação" },
    {
      label: "Financeiro", href: ROUTES.adminBilling, icon: "billing", group: "Financeiro",
      children: [
        { label: "Visão geral", href: ROUTES.adminBilling, exact: true },
        { label: "Configuração PIX", href: ROUTES.adminBillingSettings }
      ]
    },
    {
      label: "Contratos", href: ROUTES.adminContracts, icon: "contracts", group: "Documentos",
      children: [
        { label: "Visão geral", href: ROUTES.adminContracts, exact: true },
        { label: "Modelo", href: ROUTES.adminContractTemplate },
        { label: "Cancelamentos", href: ROUTES.adminCancellations }
      ]
    }
  ];
  if (profile.role === "guardian") return [
    { label: "Visão geral", href: ROUTES.guardian, exact: true, icon: "dashboard" },
    { label: "Meus dependentes", href: ROUTES.guardianDependents, icon: "family" }
  ];
  if (profile.role === "minor_student") return [
    { label: "Visão geral", href: ROUTES.student, exact: true, icon: "dashboard" },
    { label: "Minha matrícula", href: ROUTES.studentEnrollment, icon: "enrollment" },
    { label: "Minha frequência", href: ROUTES.studentAttendance, icon: "attendance" },
    { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts" }
  ];
  const items: SidebarNavItem[] = [
    { label: "Visão geral", href: ROUTES.student, exact: true, icon: "dashboard" },
    { label: "Minha matrícula", href: ROUTES.studentEnrollment, icon: "enrollment" },
    { label: "Minha frequência", href: ROUTES.studentAttendance, icon: "attendance" },
    { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts" },
    { label: "Financeiro", href: ROUTES.studentBilling, icon: "billing" }
  ];
  if (profile.capabilities.includes("guardian")) items.push({ label: "Meus dependentes", href: ROUTES.guardianDependents, icon: "family" });
  return items;
}

export function adminEnrollmentPath(studentId: string) {
  return `${ROUTES.adminEnrollments}/${encodeURIComponent(studentId)}`;
}

export function adminClassPath(classId: string) {
  return `${ROUTES.adminClasses}/${encodeURIComponent(classId)}`;
}

export function adminLessonPath(classId: string, lessonId: string) {
  return `${adminClassPath(classId)}/aulas/${encodeURIComponent(lessonId)}`;
}

export function adminExamPath(eventId: string) {
  return `${ROUTES.adminExams}/${encodeURIComponent(eventId)}`;
}

export function guardianEnrollmentPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/matricula`;
}

export function studentContractPath(contractId: string) {
  return `${ROUTES.studentContracts}/${encodeURIComponent(contractId)}`;
}

export function guardianContractsPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/contratos`;
}

export function guardianContractPath(profileId: string, contractId: string) {
  return `${guardianContractsPath(profileId)}/${encodeURIComponent(contractId)}`;
}

export function guardianBillingPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/financeiro`;
}

export function guardianAttendancePath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/frequencia`;
}
