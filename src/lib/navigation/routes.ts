import type { Profile } from "@/features/auth/types";

export const ROUTES = {
  home: "/",
  notifications: "/avisos",
  admin: "/admin",
  adminEnrollments: "/admin/matriculas",
  adminRetention: "/admin/matriculas/retencao",
  adminCompliance: "/admin/matriculas/regularidade",
  adminStudentAccess: "/admin/matriculas/acessos",
  adminClasses: "/admin/turmas",
  adminLocations: "/admin/locais",
  adminExams: "/admin/exames",
  adminExamEligibility: "/admin/exames/elegibilidade",
  studentAttendance: "/aluno/frequencia",
  studentEvolution: "/aluno/evolucao",
  studentStudies: "/aluno/estudos",
  studentAchievements: "/aluno/conquistas",
  studentCalendar: "/aluno/calendario",
  studentCard: "/aluno/carteirinha",
  studentParq: "/aluno/parq",
  studentExams: "/aluno/exames",
  adminContracts: "/admin/contratos",
  adminContractRenewals: "/admin/contratos/renovacoes",
  adminContractTemplate: "/admin/contratos/modelo",
  adminCancellations: "/admin/contratos/cancelamentos",
  adminBilling: "/admin/financeiro",
  adminBillingClosing: "/admin/financeiro/fechamento",
  adminBillingSettings: "/admin/financeiro/configuracoes",
  adminBillingCalculator: "/admin/financeiro/calculadora",
  adminBillingAdjustment: "/admin/financeiro/reajuste",
  adminAcademy: "/admin/academia",
  adminAcademyIdentity: "/admin/academia/identidade",
  adminAcademyFinance: "/admin/academia/financeiro",
  adminAcademyContracts: "/admin/academia/contratos",
  adminAnnualReport: "/admin/relatorios/anual",
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

export type SidebarNavIcon = "dashboard" | "notifications" | "enrollment" | "students" | "classes" | "exams" | "attendance" | "family" | "contracts" | "billing" | "system" | "reports";
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
          { label: "Fichas de matrícula", href: ROUTES.adminEnrollments, exact: true },
          { label: "Retenção e frequência", href: ROUTES.adminRetention },
          { label: "Regularidade anual", href: ROUTES.adminCompliance },
          { label: "Acessos ao portal", href: ROUTES.adminStudentAccess }
        ]
      },
      {
        label: "Turmas e chamadas",
        shortLabel: "Turmas",
        bottomNav: true,
        href: ROUTES.adminClasses,
        icon: "classes",
        group: "Academia",
        children: [
          { label: "Grade de turmas", href: ROUTES.adminClasses, exact: true },
          { label: "Locais e dojangs", href: ROUTES.adminLocations },
        ]
      },
      {
        label: "Exames de faixa",
        shortLabel: "Exames",
        href: ROUTES.adminExams,
        icon: "exams",
        group: "Academia",
        children: [
          { label: "Bancas de exame", href: ROUTES.adminExams, exact: true },
          { label: "Elegibilidade", href: ROUTES.adminExamEligibility }
        ]
      },
      {
        label: "Financeiro",
        bottomNav: true,
        href: ROUTES.adminBilling,
        icon: "billing",
        group: "Gestão",
        children: [
          { label: "Cobranças do mês", href: ROUTES.adminBilling, exact: true },
          { label: "Fechamento mensal", href: ROUTES.adminBillingClosing },
          { label: "Calculadora de metas", href: ROUTES.adminBillingCalculator },
          { label: "Reajuste de mensalidade", href: ROUTES.adminBillingAdjustment }
        ]
      },
      {
        label: "Contratos",
        href: ROUTES.adminContracts,
        icon: "contracts",
        group: "Gestão",
        children: [
          { label: "Contratos emitidos", href: ROUTES.adminContracts, exact: true },
          { label: "Renovações", href: ROUTES.adminContractRenewals },
          { label: "Modelo de contrato", href: ROUTES.adminContractTemplate },
          { label: "Pedidos de rescisão", href: ROUTES.adminCancellations }
        ]
      },
      {
        label: "Configurações da academia",
        shortLabel: "Academia",
        href: ROUTES.adminAcademy,
        icon: "system",
        group: "Gestão",
        children: [
          { label: "Visão geral", href: ROUTES.adminAcademy, exact: true },
          { label: "Identidade", href: ROUTES.adminAcademyIdentity },
          { label: "Financeiro", href: ROUTES.adminAcademyFinance },
          { label: "Contratos", href: ROUTES.adminAcademyContracts }
        ]
      },
      { label: "Balanço anual", shortLabel: "Anual", href: ROUTES.adminAnnualReport, icon: "reports", group: "Gestão" },
      { label: "Saúde do sistema", shortLabel: "Sistema", href: ROUTES.adminSystem, icon: "system", group: "Gestão" }
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
    { label: "Caminho da faixa", shortLabel: "Evolução", href: ROUTES.studentEvolution, icon: "exams", group: "Treino" },
    { label: "Guia de estudos", shortLabel: "Estudos", href: ROUTES.studentStudies, icon: "classes", group: "Treino" },
    { label: "Conquistas", href: ROUTES.studentAchievements, icon: "system", group: "Treino" },
    { label: "Calendário", href: ROUTES.studentCalendar, icon: "attendance", group: "Treino" },
    { label: "Meus exames", shortLabel: "Exames", bottomNav: minor, href: ROUTES.studentExams, icon: "exams", group: "Treino" },
    { label: "Carteirinha e saúde", shortLabel: "Carteirinha", href: ROUTES.studentCard, icon: "family", group: "Matrícula" },
    { label: "Questionário de saúde", shortLabel: "Saúde", href: ROUTES.studentParq, icon: "enrollment", group: "Matrícula" },
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

export function guardianParqPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/parq`;
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
