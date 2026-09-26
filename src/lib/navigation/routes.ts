import type { Profile } from "@/features/auth/types";

export const ROUTES = {
  home: "/",
  notifications: "/avisos",
  admin: "/admin",
  adminEnrollments: "/admin/matriculas",
  adminStudentAccess: "/admin/matriculas/acessos",
  adminClasses: "/admin/turmas",
  adminExams: "/admin/exames",
  studentAttendance: "/aluno/frequencia",
  adminContracts: "/admin/contratos",
  adminContractTemplate: "/admin/contratos/modelo",
  adminCancellations: "/admin/contratos/cancelamentos",
  adminBilling: "/admin/financeiro",
  adminBillingSettings: "/admin/financeiro/configuracoes",
  adminSystem: "/admin/sistema",
  student: "/aluno",
  studentEnrollment: "/aluno/matricula",
  studentContracts: "/aluno/contratos",
  studentBilling: "/aluno/financeiro",
  guardian: "/responsavel",
  guardianDependents: "/responsavel/dependentes"
} as const;

export type SidebarNavIcon = "dashboard" | "notifications" | "enrollment" | "students" | "classes" | "exams" | "attendance" | "family" | "contracts" | "billing" | "system";
export type SidebarNavGroup = "Principal" | "Alunos" | "Família" | "Treino" | "Operação" | "Financeiro" | "Documentos" | "Sistema";

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

export function navigationForProfile(
  profile: Pick<Profile, "role" | "capabilities">,
  counts: { enrollments?: number; notifications?: number } = {}
): SidebarNavItem[] {
  if (profile.role === "admin") {
    return [
      { label: "Visão geral", href: ROUTES.admin, exact: true, icon: "dashboard", group: "Principal" },
      { label: "Avisos", href: ROUTES.notifications, icon: "notifications", group: "Principal", badge: counts.notifications },
      {
        label: "Matrículas",
        href: ROUTES.adminEnrollments,
        icon: "students",
        group: "Alunos",
        badge: counts.enrollments,
        children: [
          { label: "Fila de matrículas", href: ROUTES.adminEnrollments, exact: true },
          { label: "Acessos dos alunos", href: ROUTES.adminStudentAccess }
        ]
      },
      {
        label: "Turmas e horários",
        href: ROUTES.adminClasses,
        icon: "classes",
        group: "Operação",
        children: [
          { label: "Grade de turmas", href: ROUTES.adminClasses, exact: true },
          { label: "Exames de faixa", href: ROUTES.adminExams }
        ]
      },
      {
        label: "Financeiro",
        href: ROUTES.adminBilling,
        icon: "billing",
        group: "Financeiro",
        children: [
          { label: "Visão geral", href: ROUTES.adminBilling, exact: true },
          { label: "Configurações PIX", href: ROUTES.adminBillingSettings }
        ]
      },
      {
        label: "Contratos",
        href: ROUTES.adminContracts,
        icon: "contracts",
        group: "Documentos",
        children: [
          { label: "Visão geral", href: ROUTES.adminContracts, exact: true },
          { label: "Modelo", href: ROUTES.adminContractTemplate },
          { label: "Cancelamentos", href: ROUTES.adminCancellations }
        ]
      },
      { label: "Sistema e operação", href: ROUTES.adminSystem, icon: "system", group: "Sistema" }
    ];
  }

  if (profile.role === "guardian") {
    return [
      { label: "Visão geral", href: ROUTES.guardian, exact: true, icon: "dashboard", group: "Principal" },
      { label: "Avisos", href: ROUTES.notifications, icon: "notifications", group: "Principal", badge: counts.notifications },
      {
        label: "Meus dependentes",
        href: ROUTES.guardianDependents,
        icon: "family",
        group: "Alunos",
        children: [
          { label: "Painel da família", href: ROUTES.guardian, exact: true },
          { label: "Gerenciar dependentes", href: ROUTES.guardianDependents, exact: true }
        ]
      }
    ];
  }

  if (profile.role === "minor_student") {
    return [
      { label: "Visão geral", href: ROUTES.student, exact: true, icon: "dashboard", group: "Principal" },
      { label: "Avisos", href: ROUTES.notifications, icon: "notifications", group: "Principal", badge: counts.notifications },
      {
        label: "Minha matrícula",
        href: ROUTES.studentEnrollment,
        icon: "enrollment",
        group: "Treino",
        children: [
          { label: "Ficha de matrícula", href: ROUTES.studentEnrollment, exact: true },
          { label: "Contratos", href: ROUTES.studentContracts }
        ]
      },
      { label: "Minha frequência", href: ROUTES.studentAttendance, icon: "attendance", group: "Treino" },
      { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts", group: "Documentos" }
    ];
  }

  const items: SidebarNavItem[] = [
    { label: "Visão geral", href: ROUTES.student, exact: true, icon: "dashboard", group: "Principal" },
    { label: "Avisos", href: ROUTES.notifications, icon: "notifications", group: "Principal", badge: counts.notifications },
    {
      label: "Minha matrícula",
      href: ROUTES.studentEnrollment,
      icon: "enrollment",
      group: "Treino",
      children: [
        { label: "Ficha de matrícula", href: ROUTES.studentEnrollment, exact: true },
        { label: "Meus contratos", href: ROUTES.studentContracts }
      ]
    },
    { label: "Minha frequência", href: ROUTES.studentAttendance, icon: "attendance", group: "Treino" },
    { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts", group: "Documentos" },
    { label: "Financeiro", href: ROUTES.studentBilling, icon: "billing", group: "Financeiro" }
  ];

  if (profile.capabilities.includes("guardian")) {
    items.push({
      label: "Área do Responsável",
      href: ROUTES.guardian,
      exact: true,
      icon: "dashboard",
      group: "Família"
    });
    items.push({
      label: "Meus dependentes",
      href: ROUTES.guardianDependents,
      icon: "family",
      group: "Família",
      children: [
        { label: "Painel da família", href: ROUTES.guardian, exact: true },
        { label: "Lista de dependentes", href: ROUTES.guardianDependents, exact: true }
      ]
    });
  }

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
