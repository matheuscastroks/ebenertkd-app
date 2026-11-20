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
  adminEvents: "/admin/eventos",
  adminEventNew: "/admin/eventos/novo",
  adminEventHub: "/admin/eventos/inscricoes",
  adminExams: "/admin/eventos/exames",
  adminExamEligibility: "/admin/eventos/exames/elegibilidade",
  studentAttendance: "/aluno/frequencia",
  studentEvolution: "/aluno/evolucao",
  studentStudies: "/aluno/estudos",
  studentAchievements: "/aluno/conquistas",
  studentCalendar: "/aluno/calendario",
  studentCard: "/aluno/carteirinha",
  studentParq: "/aluno/parq",
  studentExams: "/aluno/exames",
  studentEvents: "/aluno/eventos",
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
  adminAcademyGrades: "/admin/academia/graduacoes",
  adminAcademyExams: "/admin/academia/exames",
  adminAcademyRules: "/admin/academia/regras",
  adminAcademySetup: "/admin/academia/primeiros-passos",
  adminAcademyHistory: "/admin/academia/historico",
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

export type SidebarNavIcon =
  | "dashboard"
  | "notifications"
  | "students"
  | "classes"
  | "events"
  | "attendance"
  | "belt"
  | "enrollment"
  | "family"
  | "contracts"
  | "billing"
  | "reports"
  | "settings";

/** Grupos do sidebar. "Principal" abre a navegação sem rótulo visível; "Rodapé" fica fixo acima da conta. */
export type SidebarNavGroup = "Principal" | "Rotina" | "Gestão" | "Rodapé";

/** Visão irmã dentro de uma seção: aparece como controle segmentado abaixo do título. */
export type NavSegment = {
  label: string;
  href: string;
};

/**
 * Seção do app (modelo Seção → Segmento → Pilha).
 * Cada item do sidebar é uma seção; as subtelas são segmentos (links por URL) e as telas de
 * detalhe abrem em pilha, com voltar para o segmento de origem.
 */
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
  /** Visões irmãs da seção, na ordem do controle segmentado. */
  segments?: NavSegment[];
  /** Prefixos extras que pertencem à seção (telas em pilha fora dos segmentos). */
  match?: string[];
};

export function navigationForProfile(
  profile: Pick<Profile, "role" | "capabilities">,
  counts: { enrollments?: number; notifications?: number } = {}
): SidebarNavItem[] {
  const notifications: SidebarNavItem = { label: "Avisos", href: ROUTES.notifications, icon: "notifications", group: "Principal", badge: counts.notifications };

  if (profile.role === "admin") {
    return [
      { label: "Hoje", href: ROUTES.admin, exact: true, icon: "dashboard", group: "Principal" },
      notifications,
      {
        label: "Alunos",
        href: ROUTES.adminEnrollments,
        icon: "students",
        group: "Rotina",
        badge: counts.enrollments,
        match: ["/admin/alunos"],
        segments: [
          { label: "Fichas", href: ROUTES.adminEnrollments },
          { label: "Frequência e risco", href: ROUTES.adminRetention },
          { label: "Documentos anuais", href: ROUTES.adminCompliance },
          { label: "Acessos", href: ROUTES.adminStudentAccess }
        ]
      },
      {
        label: "Turmas",
        bottomNav: true,
        href: ROUTES.adminClasses,
        icon: "classes",
        group: "Rotina",
        segments: [
          { label: "Grade", href: ROUTES.adminClasses },
          { label: "Locais", href: ROUTES.adminLocations }
        ]
      },
      {
        label: "Eventos",
        href: ROUTES.adminEvents,
        icon: "events",
        group: "Rotina",
        segments: [
          { label: "Agenda", href: ROUTES.adminEvents },
          { label: "Inscrições", href: ROUTES.adminEventHub },
          { label: "Exames de faixa", href: ROUTES.adminExams },
          { label: "Aptidão", href: ROUTES.adminExamEligibility }
        ]
      },
      {
        label: "Financeiro",
        bottomNav: true,
        href: ROUTES.adminBilling,
        icon: "billing",
        group: "Gestão",
        segments: [
          { label: "Cobranças", href: ROUTES.adminBilling },
          { label: "Fechamento", href: ROUTES.adminBillingClosing },
          { label: "Metas", href: ROUTES.adminBillingCalculator },
          { label: "Reajuste", href: ROUTES.adminBillingAdjustment }
        ]
      },
      {
        label: "Contratos",
        href: ROUTES.adminContractRenewals,
        icon: "contracts",
        group: "Gestão",
        match: [ROUTES.adminContracts],
        segments: [
          { label: "Renovações", href: ROUTES.adminContractRenewals },
          { label: "Rescisões", href: ROUTES.adminCancellations },
          { label: "Modelo", href: ROUTES.adminContractTemplate }
        ]
      },
      {
        label: "Relatórios",
        href: ROUTES.adminAnnualReport,
        icon: "reports",
        group: "Gestão",
        match: ["/admin/relatorios"],
        segments: [{ label: "Balanço anual", href: ROUTES.adminAnnualReport }]
      },
      {
        label: "Ajustes",
        href: ROUTES.adminAcademy,
        icon: "settings",
        group: "Rodapé",
        match: [ROUTES.adminSystem, ROUTES.adminBillingSettings]
      }
    ];
  }

  const family: SidebarNavItem = { label: "Família", href: ROUTES.guardian, icon: "family", group: "Principal" };

  if (profile.role === "guardian") {
    return [family, notifications];
  }

  const minor = profile.role === "minor_student";
  const items: SidebarNavItem[] = [
    { label: "Início", href: ROUTES.student, exact: true, icon: "dashboard", group: "Principal" },
    notifications,
    {
      label: "Treinos",
      bottomNav: true,
      href: ROUTES.studentCalendar,
      icon: "attendance",
      group: "Principal",
      segments: [
        { label: "Agenda", href: ROUTES.studentCalendar },
        { label: "Frequência", href: ROUTES.studentAttendance }
      ]
    },
    {
      label: "Faixa",
      bottomNav: minor,
      href: ROUTES.studentEvolution,
      icon: "belt",
      group: "Principal",
      segments: [
        { label: "Progresso", href: ROUTES.studentEvolution },
        { label: "Exames", href: ROUTES.studentExams },
        { label: "Estudos", href: ROUTES.studentStudies },
        { label: "Conquistas", href: ROUTES.studentAchievements }
      ]
    },
    { label: "Eventos", href: ROUTES.studentEvents, icon: "events", group: "Principal" },
    {
      label: "Cadastro",
      href: ROUTES.studentCard,
      icon: "enrollment",
      group: "Principal",
      segments: [
        { label: "Carteirinha", href: ROUTES.studentCard },
        { label: "Ficha", href: ROUTES.studentEnrollment },
        { label: "Saúde", href: ROUTES.studentParq },
        { label: "Contratos", href: ROUTES.studentContracts }
      ]
    }
  ];

  if (minor) return items;

  items.push({ label: "Pagamentos", bottomNav: true, href: ROUTES.studentBilling, icon: "billing", group: "Principal" });

  if (profile.capabilities.includes("guardian")) items.push(family);

  return items;
}

/** Onde o usuário está: a seção ativa, o segmento ativo e se a tela é de detalhe (pilha). */
export type NavLocation = {
  section?: SidebarNavItem;
  segment?: NavSegment;
  isDetail: boolean;
};

const PROFILE_ROOTS = new Set<string>([ROUTES.admin, ROUTES.student]);

function prefixMatches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Resolve a seção pelo prefixo mais longo, para que `/admin/eventos/exames/x` caia em Eventos
 * e no segmento "Exames de faixa". As raízes `/admin` e `/aluno` só casam exatamente.
 */
export function resolveNavLocation(items: SidebarNavItem[], pathname: string): NavLocation {
  let best: { section: SidebarNavItem; length: number } | undefined;
  for (const item of items) {
    if (item.icon === "notifications") continue;
    const prefixes = [item.href, ...(item.segments ?? []).map((segment) => segment.href), ...(item.match ?? [])];
    for (const prefix of prefixes) {
      const hit = PROFILE_ROOTS.has(prefix) ? pathname === prefix : prefixMatches(pathname, prefix);
      if (hit && (!best || prefix.length > best.length)) best = { section: item, length: prefix.length };
    }
  }
  if (!best) return { isDetail: false };
  const { section } = best;
  const segment = (section.segments ?? [])
    .filter((candidate) => prefixMatches(pathname, candidate.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const roots = [section.href, ...(section.segments ?? []).map((candidate) => candidate.href)];
  return { section, segment, isDetail: !roots.includes(pathname) };
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

export function adminEventPath(eventId: string) {
  return `${ROUTES.adminEvents}/${encodeURIComponent(eventId)}`;
}

export function guardianEventsPath(profileId: string) {
  return `${ROUTES.guardianDependents}/${encodeURIComponent(profileId)}/eventos`;
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
