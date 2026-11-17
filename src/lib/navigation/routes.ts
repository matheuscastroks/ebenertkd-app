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
  studentExams: "/aluno/exames",
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
  guardianDependents: "/responsavel/dependentes",
  settings: "/configuracoes",
  privacy: "/privacidade"
} as const;

export type SidebarNavIcon = "dashboard" | "notifications" | "enrollment" | "students" | "classes" | "exams" | "attendance" | "family" | "contracts" | "billing" | "system";
// "Principal" abre a navegação sem rótulo visível; os demais nomes agrupam destinos afins.
// Os nomes antigos continuam aceitos para não quebrar chamadas existentes.
export type SidebarNavGroup =
  | "Principal"
  | "Academia"
  | "Gestão"
  | "Treino"
  | "Matrícula"
  | "Família"
  | "Alunos"
  | "Operação"
  | "Financeiro"
  | "Documentos"
  | "Sistema";

export type SidebarNavItem = {
  label: string;
  /** Rótulo curto da barra inferior mobile; cai para `label` quando ausente. */
  shortLabel?: string;
  /** Marca o destino como atalho da barra inferior mobile (no máximo dois por perfil). */
  bottomNav?: boolean;
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
  const notifications: SidebarNavItem = { label: "Avisos", href: ROUTES.notifications, icon: "notifications", group: "Principal", badge: counts.notifications };

  if (profile.role === "admin") {
    return [
      { label: "Visão geral", href: ROUTES.admin, exact: true, icon: "dashboard", group: "Principal" },
      notifications,
      {
        label: "Matrículas",
        href: ROUTES.adminEnrollments,
        icon: "students",
        group: "Academia",
        badge: counts.enrollments,
        children: [
          { label: "Fila de matrículas", href: ROUTES.adminEnrollments, exact: true },
          { label: "Acessos dos alunos", href: ROUTES.adminStudentAccess }
        ]
      },
      {
        label: "Turmas e horários",
        shortLabel: "Turmas",
        bottomNav: true,
        href: ROUTES.adminClasses,
        icon: "classes",
        group: "Academia",
        children: [
          { label: "Grade de turmas", href: ROUTES.adminClasses, exact: true },
          { label: "Exames de faixa", href: ROUTES.adminExams }
        ]
      },
      {
        label: "Financeiro",
        bottomNav: true,
        href: ROUTES.adminBilling,
        icon: "billing",
        group: "Gestão",
        children: [
          { label: "Visão geral", href: ROUTES.adminBilling, exact: true },
          { label: "Configurações PIX", href: ROUTES.adminBillingSettings }
        ]
      },
      {
        label: "Contratos",
        href: ROUTES.adminContracts,
        icon: "contracts",
        group: "Gestão",
        children: [
          { label: "Visão geral", href: ROUTES.adminContracts, exact: true },
          { label: "Modelo", href: ROUTES.adminContractTemplate },
          { label: "Cancelamentos", href: ROUTES.adminCancellations }
        ]
      },
      { label: "Sistema e operação", shortLabel: "Sistema", href: ROUTES.adminSystem, icon: "system", group: "Gestão" }
    ];
  }

  const dependents: SidebarNavItem = { label: "Dependentes", href: ROUTES.guardianDependents, icon: "family" };

  if (profile.role === "guardian") {
    // Perfil com poucos destinos: um grupo só, sem rótulo extra.
    return [
      { label: "Visão geral", href: ROUTES.guardian, exact: true, icon: "dashboard", group: "Principal" },
      notifications,
      { ...dependents, bottomNav: true, group: "Principal" }
    ];
  }

  const minor = profile.role === "minor_student";
  const items: SidebarNavItem[] = [
    { label: "Visão geral", href: ROUTES.student, exact: true, icon: "dashboard", group: "Principal" },
    notifications,
    { label: "Minha frequência", shortLabel: "Frequência", bottomNav: true, href: ROUTES.studentAttendance, icon: "attendance", group: "Treino" },
    { label: "Meus exames", shortLabel: "Exames", bottomNav: minor, href: ROUTES.studentExams, icon: "exams", group: "Treino" },
    { label: "Minha matrícula", shortLabel: "Matrícula", href: ROUTES.studentEnrollment, icon: "enrollment", group: "Matrícula" },
    { label: "Contratos", href: ROUTES.studentContracts, icon: "contracts", group: "Matrícula" }
  ];

  if (minor) return items;

  items.push({ label: "Financeiro", bottomNav: true, href: ROUTES.studentBilling, icon: "billing", group: "Matrícula" });

  if (profile.capabilities.includes("guardian")) {
    items.push(
      { label: "Área do responsável", href: ROUTES.guardian, exact: true, icon: "dashboard", group: "Família" },
      { ...dependents, group: "Família" }
    );
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

export function guardianExamsPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/exames`;
}
