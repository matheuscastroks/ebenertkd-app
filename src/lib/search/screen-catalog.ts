import type { AppCapability } from "@/lib/auth/auth-utils";
import { ROUTES, type SidebarNavItem } from "@/lib/navigation/routes";
import type { SearchScreenItem } from "@/lib/search/types";

const ADMIN_SCREENS: SearchScreenItem[] = [
  {
    id: "admin-home",
    title: "Hoje",
    subtitle: "Resumo do dia, pendências e próximas aulas",
    section: "Principal",
    href: ROUTES.admin,
    icon: "dashboard",
    keywords: ["inicio", "visao geral", "resumo", "painel", "dashboard", "aulas de hoje", "pendencias"],
  },
  {
    id: "shared-notifications",
    title: "Avisos",
    subtitle: "Central de comunicados e notificações",
    section: "Principal",
    href: ROUTES.notifications,
    icon: "notifications",
    keywords: ["notificacoes", "mensagens", "alertas", "comunicados", "pendencias", "inbox"],
  },
  {
    id: "admin-enrollments",
    title: "Alunos · Fichas",
    subtitle: "Cadastro, revisão e matrícula dos alunos",
    section: "Alunos",
    href: ROUTES.adminEnrollments,
    icon: "students",
    keywords: ["alunos", "matriculas", "fichas", "cadastro", "revisao", "estudantes", "lista"],
  },
  {
    id: "admin-retention",
    title: "Alunos · Frequência e risco",
    subtitle: "Faltas consecutivas, retenção e risco de evasão",
    section: "Alunos",
    href: ROUTES.adminRetention,
    icon: "attendance",
    keywords: ["frequencia", "faltas", "sumido", "evasao", "desistencia", "risco", "retencao", "presenca"],
  },
  {
    id: "admin-compliance",
    title: "Alunos · Documentos anuais",
    subtitle: "Regularidade de PAR-Q, atestados e termos",
    section: "Alunos",
    href: ROUTES.adminCompliance,
    icon: "enrollment",
    keywords: ["regularidade", "documentos anuais", "parq", "atestado", "saude", "pendencias", "laudo"],
  },
  {
    id: "admin-student-access",
    title: "Alunos · Acessos",
    subtitle: "Contas, logins, senhas e liberação de acesso",
    section: "Alunos",
    href: ROUTES.adminStudentAccess,
    icon: "settings",
    keywords: ["acessos", "login", "senha", "conta", "bloqueio", "liberacao", "credenciais"],
  },
  {
    id: "admin-classes",
    title: "Turmas · Grade",
    subtitle: "Horários, turmas ativas e lista de chamada",
    section: "Turmas",
    href: ROUTES.adminClasses,
    icon: "classes",
    keywords: ["turmas", "grade", "horarios", "aulas", "chamada", "presenca", "treinos"],
  },
  {
    id: "admin-locations",
    title: "Turmas · Locais",
    subtitle: "Unidades, dojangs e endereços de treino",
    section: "Turmas",
    href: ROUTES.adminLocations,
    icon: "classes",
    keywords: ["locais", "dojang", "unidades", "enderecos", "salas", "polos", "localizacao"],
  },
  {
    id: "admin-events",
    title: "Eventos · Agenda",
    subtitle: "Campeonatos, seminários e eventos da academia",
    section: "Eventos",
    href: ROUTES.adminEvents,
    icon: "events",
    keywords: ["eventos", "agenda", "campeonato", "torneio", "seminario", "competicao"],
  },
  {
    id: "admin-event-new",
    title: "Eventos · Novo evento",
    subtitle: "Criar campeonato, seminário ou exame",
    section: "Eventos",
    href: ROUTES.adminEventNew,
    icon: "events",
    keywords: ["novo evento", "criar evento", "cadastrar campeonato", "novo exame"],
  },
  {
    id: "admin-event-hub",
    title: "Eventos · Inscrições",
    subtitle: "Aprovações e acompanhamento de inscritos",
    section: "Eventos",
    href: ROUTES.adminEventHub,
    icon: "events",
    keywords: ["inscricoes", "inscritos", "participantes", "aprovacao", "vagas"],
  },
  {
    id: "admin-exams",
    title: "Eventos · Exames de faixa",
    subtitle: "Gestão de exames de graduação e resultados",
    section: "Eventos",
    href: ROUTES.adminExams,
    icon: "belt",
    keywords: ["exame de faixa", "exames", "graduacao", "troca de faixa", "banca", "gub", "dan"],
  },
  {
    id: "admin-exam-eligibility",
    title: "Eventos · Aptidão",
    subtitle: "Alunos aptos para o próximo exame de faixa",
    section: "Eventos",
    href: ROUTES.adminExamEligibility,
    icon: "belt",
    keywords: ["aptidao", "elegibilidade", "apto", "exame", "pronto para faixa", "requisitos"],
  },
  {
    id: "admin-billing",
    title: "Financeiro · Cobranças",
    subtitle: "Mensalidades, comprovantes PIX e inadimplência",
    section: "Financeiro",
    href: ROUTES.adminBilling,
    icon: "billing",
    keywords: ["financeiro", "cobrancas", "mensalidade", "boleto", "pix", "pagamento", "inadimplente", "atrasado", "pagar"],
  },
  {
    id: "admin-billing-closing",
    title: "Financeiro · Fechamento",
    subtitle: "Conciliação mensal e fechamento de caixa",
    section: "Financeiro",
    href: ROUTES.adminBillingClosing,
    icon: "billing",
    keywords: ["fechamento", "caixa", "conciliacao", "mes", "recebimentos", "balanco"],
  },
  {
    id: "admin-billing-calculator",
    title: "Financeiro · Metas",
    subtitle: "Simulador de faturamento, alunos e receitas",
    section: "Financeiro",
    href: ROUTES.adminBillingCalculator,
    icon: "reports",
    keywords: ["metas", "calculadora", "simular", "previsao", "faturamento", "cenarios"],
  },
  {
    id: "admin-billing-adjustment",
    title: "Financeiro · Reajuste",
    subtitle: "Campanhas de reajuste anual de mensalidades",
    section: "Financeiro",
    href: ROUTES.adminBillingAdjustment,
    icon: "billing",
    keywords: ["reajuste", "aumento", "correcao", "mensalidade", "anual", "tarifa"],
  },
  {
    id: "admin-billing-settings",
    title: "Financeiro · Configurações antigas",
    subtitle: "Parâmetros de cobrança e chaves PIX",
    section: "Ajustes",
    href: ROUTES.adminBillingSettings,
    icon: "settings",
    keywords: ["configuracoes financeiras", "pix", "juros", "multa", "vencimento"],
  },
  {
    id: "admin-contract-renewals",
    title: "Contratos · Renovações",
    subtitle: "Contratos próximos do vencimento e rematrículas",
    section: "Contratos",
    href: ROUTES.adminContractRenewals,
    icon: "contracts",
    keywords: ["contratos", "renovacoes", "renovar", "rematricula", "vencimento", "assinatura"],
  },
  {
    id: "admin-cancellations",
    title: "Contratos · Rescisões",
    subtitle: "Pedidos de cancelamento e encerramento",
    section: "Contratos",
    href: ROUTES.adminCancellations,
    icon: "contracts",
    keywords: ["rescisoes", "cancelamentos", "cancelar", "encerramento", "saida", "desistencia"],
  },
  {
    id: "admin-contract-template",
    title: "Contratos · Modelo",
    subtitle: "Texto base e cláusulas do contrato da academia",
    section: "Contratos",
    href: ROUTES.adminContractTemplate,
    icon: "contracts",
    keywords: ["modelo de contrato", "clausulas", "texto", "minuta", "termo"],
  },
  {
    id: "admin-annual-report",
    title: "Relatórios · Balanço anual",
    subtitle: "Indicadores anuais de alunos, aulas e receita",
    section: "Relatórios",
    href: ROUTES.adminAnnualReport,
    icon: "reports",
    keywords: ["relatorios", "balanco anual", "estatisticas", "indicadores", "anual", "resultados"],
  },
  {
    id: "admin-academy",
    title: "Ajustes da academia",
    subtitle: "Central de dados, regras, faixas e sistema",
    section: "Ajustes",
    href: ROUTES.adminAcademy,
    icon: "settings",
    keywords: ["ajustes", "academia", "configuracoes", "parametros", "geral"],
  },
  {
    id: "admin-academy-identity",
    title: "Ajustes · Identidade",
    subtitle: "Nome da academia, endereço, contato e professor",
    section: "Ajustes",
    href: ROUTES.adminAcademyIdentity,
    icon: "settings",
    keywords: ["identidade", "nome da academia", "marca", "cnpj", "endereco", "contato", "professor"],
  },
  {
    id: "admin-academy-finance",
    title: "Ajustes · Financeiro e PIX",
    subtitle: "Mensalidade padrão, matrícula, vencimentos e PIX",
    section: "Ajustes",
    href: ROUTES.adminAcademyFinance,
    icon: "billing",
    keywords: ["financeiro e pix", "chave pix", "mensalidade padrao", "taxa de matricula", "vencimento"],
  },
  {
    id: "admin-academy-contracts",
    title: "Ajustes · Contratos",
    subtitle: "Duração, aviso prévio, multa e rematrícula",
    section: "Ajustes",
    href: ROUTES.adminAcademyContracts,
    icon: "contracts",
    keywords: ["politica de contratos", "prazo de cancelamento", "multa", "duracao", "rematricula"],
  },
  {
    id: "admin-academy-grades",
    title: "Ajustes · Graduações",
    subtitle: "Faixas, cores, tempo mínimo e presenças exigidas",
    section: "Ajustes",
    href: ROUTES.adminAcademyGrades,
    icon: "belt",
    keywords: ["graduacoes", "faixa", "gub", "dan", "cor da faixa", "troca de faixa", "carencia"],
  },
  {
    id: "admin-academy-exams",
    title: "Ajustes · Exames",
    subtitle: "Taxa padrão e bloqueios de inscrição em exames",
    section: "Ajustes",
    href: ROUTES.adminAcademyExams,
    icon: "belt",
    keywords: ["regras de exame", "taxa de exame", "bloqueio por atraso", "exames"],
  },
  {
    id: "admin-academy-rules",
    title: "Ajustes · Regras",
    subtitle: "Evasão, validade de atestado/PAR-Q, avisos e conquistas",
    section: "Ajustes",
    href: ROUTES.adminAcademyRules,
    icon: "settings",
    keywords: ["regras", "evasao", "validade atestado", "validade parq", "lembretes", "conquistas"],
  },
  {
    id: "admin-academy-setup",
    title: "Ajustes · Primeiros passos",
    subtitle: "Guia inicial de configuração da academia",
    section: "Ajustes",
    href: ROUTES.adminAcademySetup,
    icon: "settings",
    keywords: ["primeiros passos", "onboarding", "setup", "configuracao inicial"],
  },
  {
    id: "admin-academy-history",
    title: "Ajustes · Histórico",
    subtitle: "Registro de alterações nas configurações",
    section: "Ajustes",
    href: ROUTES.adminAcademyHistory,
    icon: "reports",
    keywords: ["historico", "auditoria", "alteracoes", "quem mudou"],
  },
  {
    id: "admin-system",
    title: "Ajustes · Sistema e backup",
    subtitle: "Rotinas automáticas, backup e armazenamento",
    section: "Ajustes",
    href: ROUTES.adminSystem,
    icon: "settings",
    keywords: ["sistema", "backup", "rotinas", "armazenamento", "automacao", "google drive"],
  },
  {
    id: "shared-settings",
    title: "Minha conta",
    subtitle: "Perfil pessoal, tema, notificações e aplicativo",
    section: "Conta",
    href: ROUTES.settings,
    icon: "settings",
    keywords: ["minha conta", "perfil", "tema", "escuro", "claro", "push", "notificacoes", "instalar app"],
  },
];

const STUDENT_BASE_SCREENS: SearchScreenItem[] = [
  {
    id: "student-home",
    title: "Início",
    subtitle: "Resumo do aluno, próximo treino e pendências",
    section: "Principal",
    href: ROUTES.student,
    icon: "dashboard",
    keywords: ["inicio", "visao geral", "resumo", "painel", "hoje", "proximo treino"],
  },
  {
    id: "shared-notifications",
    title: "Avisos",
    subtitle: "Comunicados da academia e lembretes",
    section: "Principal",
    href: ROUTES.notifications,
    icon: "notifications",
    keywords: ["avisos", "notificacoes", "mensagens", "comunicados", "alertas"],
  },
  {
    id: "student-calendar",
    title: "Agenda",
    subtitle: "Calendário mensal de treinos e check-in",
    section: "Rotina",
    href: ROUTES.studentCalendar,
    icon: "attendance",
    keywords: ["agenda", "calendario", "horarios", "treinos", "aulas", "checkin"],
  },
  {
    id: "student-attendance",
    title: "Frequência",
    subtitle: "Histórico de presenças, faltas e justificativas",
    section: "Rotina",
    href: ROUTES.studentAttendance,
    icon: "attendance",
    keywords: ["frequencia", "presencas", "faltas", "justificativa", "chamada", "historico de aulas"],
  },
  {
    id: "student-evolution",
    title: "Faixa · Progresso",
    subtitle: "Sua graduação atual e requisitos para a próxima faixa",
    section: "Faixa",
    href: ROUTES.studentEvolution,
    icon: "belt",
    keywords: ["faixa", "progresso", "evolucao", "graduacao", "gub", "dan", "proxima faixa", "troca de faixa"],
  },
  {
    id: "student-exams",
    title: "Faixa · Exames",
    subtitle: "Inscrições e resultados em exames de faixa",
    section: "Faixa",
    href: ROUTES.studentExams,
    icon: "belt",
    keywords: ["exames", "exame de faixa", "banca", "resultado", "aprovacao", "troca de faixa"],
  },
  {
    id: "student-studies",
    title: "Faixa · Estudos",
    subtitle: "Poomsaes, termos em coreano e material técnico",
    section: "Faixa",
    href: ROUTES.studentStudies,
    icon: "belt",
    keywords: ["estudos", "poomsae", "apostila", "teoria", "coreano", "tecnica", "golpes"],
  },
  {
    id: "student-achievements",
    title: "Faixa · Conquistas",
    subtitle: "Medalhas e marcos desbloqueados nos treinos",
    section: "Faixa",
    href: ROUTES.studentAchievements,
    icon: "belt",
    keywords: ["conquistas", "medalhas", "badges", "trofeus", "desafios", "metas"],
  },
  {
    id: "student-events",
    title: "Eventos",
    subtitle: "Campeonatos, seminários e inscrições abertas",
    section: "Principal",
    href: ROUTES.studentEvents,
    icon: "events",
    keywords: ["eventos", "campeonatos", "torneios", "seminarios", "inscricao"],
  },
  {
    id: "student-card",
    title: "Cadastro · Carteirinha",
    subtitle: "Carteirinha digital de identificação do aluno",
    section: "Cadastro",
    href: ROUTES.studentCard,
    icon: "enrollment",
    keywords: ["carteirinha", "identidade", "qr", "documento", "cartao do aluno"],
  },
  {
    id: "student-enrollment",
    title: "Cadastro · Ficha",
    subtitle: "Dados pessoais, foto e matrícula",
    section: "Cadastro",
    href: ROUTES.studentEnrollment,
    icon: "enrollment",
    keywords: ["ficha", "matricula", "cadastro", "dados pessoais", "foto", "endereco"],
  },
  {
    id: "student-parq",
    title: "Cadastro · Saúde (PAR-Q)",
    subtitle: "Questionário de saúde e atestado médico",
    section: "Cadastro",
    href: ROUTES.studentParq,
    icon: "enrollment",
    keywords: ["saude", "parq", "questionario medico", "atestado", "apto", "ficha medica", "lesao"],
  },
  {
    id: "student-contracts",
    title: "Cadastro · Contratos",
    subtitle: "Visualizar, assinar e baixar contratos",
    section: "Cadastro",
    href: ROUTES.studentContracts,
    icon: "contracts",
    keywords: ["contratos", "assinatura", "pdf", "termo", "renovacao", "cancelamento"],
  },
  {
    id: "shared-settings",
    title: "Minha conta",
    subtitle: "Preferências de perfil, tema, notificações e senha",
    section: "Conta",
    href: ROUTES.settings,
    icon: "settings",
    keywords: ["conta", "configuracoes", "perfil", "tema", "notificacoes", "senha"],
  },
];

const STUDENT_BILLING_SCREEN: SearchScreenItem = {
  id: "student-billing",
  title: "Pagamentos",
  subtitle: "Mensalidades em aberto, PIX e histórico financeiro",
  section: "Principal",
  href: ROUTES.studentBilling,
  icon: "billing",
  keywords: ["pagamentos", "mensalidade", "boleto", "pix", "financeiro", "fatura", "recibo", "pagar"],
};

const GUARDIAN_SCREENS: SearchScreenItem[] = [
  {
    id: "guardian-family",
    title: "Família",
    subtitle: "Resumo dos dependentes, avisos e pendências",
    section: "Família",
    href: ROUTES.guardian,
    icon: "family",
    keywords: ["familia", "responsavel", "filhos", "dependentes", "menores", "resumo"],
  },
  {
    id: "guardian-dependents",
    title: "Família · Dependentes e acessos",
    subtitle: "Cadastrar menor, redefinir senha e gerenciar vínculos",
    section: "Família",
    href: ROUTES.guardianDependents,
    icon: "family",
    keywords: ["dependentes", "filho", "menor", "acesso", "senha do menor", "login do filho", "vincular"],
  },
];

const GUARDIAN_ONLY_EXTRAS: SearchScreenItem[] = [
  {
    id: "shared-notifications",
    title: "Avisos",
    subtitle: "Comunicados da academia e lembretes",
    section: "Principal",
    href: ROUTES.notifications,
    icon: "notifications",
    keywords: ["avisos", "notificacoes", "mensagens", "comunicados", "alertas"],
  },
  {
    id: "shared-settings",
    title: "Minha conta",
    subtitle: "Perfil do responsável, tema e notificações",
    section: "Conta",
    href: ROUTES.settings,
    icon: "settings",
    keywords: ["conta", "configuracoes", "perfil", "tema", "notificacoes", "senha"],
  },
];

function screensFromFallbackNav(navItems: SidebarNavItem[]): SearchScreenItem[] {
  const result: SearchScreenItem[] = [];
  for (const item of navItems) {
    result.push({
      id: `nav-${item.href}`,
      title: item.label,
      subtitle: item.group ?? "Navegação",
      section: item.group ?? "Navegação",
      href: item.href,
      icon: item.icon ?? "dashboard",
      keywords: [item.label],
    });
    for (const segment of item.segments ?? []) {
      result.push({
        id: `nav-seg-${segment.href}`,
        title: `${item.label} · ${segment.label}`,
        subtitle: item.label,
        section: item.label,
        href: segment.href,
        icon: item.icon ?? "dashboard",
        keywords: [item.label, segment.label],
      });
    }
  }
  return result;
}

/**
 * Retorna todas as telas autorizadas para o perfil/capacidades do usuário,
 * usando sempre as constantes de `ROUTES`.
 */
export function getSearchScreensForProfile(
  profile: { role?: string; capabilities?: AppCapability[] },
  fallbackNavItems: SidebarNavItem[] = []
): SearchScreenItem[] {
  if (profile.role === "admin") {
    return ADMIN_SCREENS;
  }

  if (profile.role === "guardian") {
    return [...GUARDIAN_SCREENS, ...GUARDIAN_ONLY_EXTRAS];
  }

  if (profile.role === "minor_student") {
    return STUDENT_BASE_SCREENS;
  }

  if (profile.role === "adult_student") {
    const items = [...STUDENT_BASE_SCREENS, STUDENT_BILLING_SCREEN];
    if (profile.capabilities?.includes("guardian")) {
      items.push(...GUARDIAN_SCREENS);
    }
    return items;
  }

  return screensFromFallbackNav(fallbackNavItems);
}
