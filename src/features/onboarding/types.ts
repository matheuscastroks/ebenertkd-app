import type { AppRole } from "@/lib/auth/auth-utils";

export type OnboardingRole = AppRole;

export type OnboardingQuestionOption = {
  id: string;
  label: string;
  description: string;
  iconName?: string;
};

export type OnboardingQuestion = {
  id: string;
  title: string;
  description?: string;
  options: OnboardingQuestionOption[];
};

export type OnboardingPreferences = {
  primaryFocus?: string;
  secondaryGoal?: string;
  frequency?: string;
  completedAt?: string;
  [key: string]: unknown;
};

export type RoleOnboardingConfig = {
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeHighlight: string;
  ahaMomentDescription: string;
  benefitBullets: Array<{ title: string; desc: string }>;
  questions: OnboardingQuestion[];
  pushTitle: string;
  pushDescription: string;
  primaryActionLabel: string;
  primaryActionHref: string;
};

export const ONBOARDING_CONFIGS: Record<OnboardingRole, RoleOnboardingConfig> = {
  admin: {
    welcomeTitle: "Bem-vindo ao Centro de Comando Ebener TKD",
    welcomeSubtitle: "Gerencie turmas, acompanhe matrículas e controle exames de graduação com máxima clareza.",
    welcomeHighlight: "Mestre Ebener Santos",
    ahaMomentDescription: "Tenha em mãos a chamada de treinos em 1 toque, controle financeiro via PIX e bancas de graduação organizadas.",
    benefitBullets: [
      { title: "Chamada de Presença Táctil", desc: "Registre presenças de turmas inteiras no dojang em segundos." },
      { title: "Bancas de Exames de 1 Toque", desc: "Avalie candidatos organizados por faixas sem pilhas de papel." },
      { title: "Financeiro Descomplicado", desc: "Controle mensalidades e aprove comprovantes PIX instantaneamente." }
    ],
    questions: [
      {
        id: "primaryFocus",
        title: "Qual é o principal foco da sua gestão hoje?",
        options: [
          { id: "attendance", label: "Controle de Aulas e Chamadas", description: "Acompanhar assiduidade diária dos alunos e turmas" },
          { id: "exams", label: "Graduações e Exames de Faixa", description: "Organizar bancas examinadoras e evolução marcial" },
          { id: "billing", label: "Controle Financeiro e Mensalidades", description: "Recebimentos via PIX e conciliação de pagamentos" }
        ]
      },
      {
        id: "secondaryGoal",
        title: "Quantos praticantes treinam regularmente no Dojang?",
        options: [
          { id: "small", label: "Até 30 alunos", description: "Gestão focada em turmas exclusivas e atenção personalizada" },
          { id: "medium", label: "30 a 100 alunos", description: "Múltiplas turmas ativas entre infantis, jovens e adultos" },
          { id: "large", label: "Mais de 100 alunos", description: "Grande volume de praticantes e equipe de competição" }
        ]
      }
    ],
    pushTitle: "Alertas imediatos da Secretaria",
    pushDescription: "Fique sabendo no exato instante em que novos comprovantes PIX forem enviados ou quando alunos submeterem pedidos de matrícula.",
    primaryActionLabel: "Acessar Painel da Academia",
    primaryActionHref: "/admin"
  },
  adult_student: {
    welcomeTitle: "Sua Jornada Marcial na Ebener TKD",
    welcomeSubtitle: "Acompanhe seu treino, sua frequência e sua trilha de evolução de faixas rumo à Faixa Preta.",
    welcomeHighlight: "Praticante de Taekwondo",
    ahaMomentDescription: "Visualize exatamente quantos treinos faltam para sua próxima graduação e mantenha sua disciplina marcial no topo.",
    benefitBullets: [
      { title: "Trilha da Faixa Preta", desc: "Veja seu GUB atual, o poomsae da graduação e os requisitos do próximo exame." },
      { title: "Frequência e Assiduidade", desc: "Histórico completo das suas presenças e alertas dos próximos treinos." },
      { title: "Financeiro e Contratos", desc: "Acesse chave PIX da academia e assine contratos diretamente pelo app." }
    ],
    questions: [
      {
        id: "primaryFocus",
        title: "Qual é o seu objetivo principal no Taekwondo?",
        options: [
          { id: "black_belt", label: "Conquistar a Faixa Preta", description: "Progredir em cada graduação com excelência técnica" },
          { id: "conditioning", label: "Saúde e Condicionamento", description: "Ganhar flexibilidade, resistência física e queimar calorias" },
          { id: "competition", label: "Competições e Lutas (Kyorugui)", description: "Treinar focado em campeonatos e equipe de alto rendimento" },
          { id: "defense", label: "Defesa Pessoal e Disciplina", description: "Aprender técnicas marciais eficientes e foco mental" }
        ]
      },
      {
        id: "frequency",
        title: "Com que frequência você planeja treinar por semana?",
        options: [
          { id: "twice", label: "2 vezes por semana", description: "Ritmo consistente e equilibrado para a rotina" },
          { id: "thrice", label: "3 vezes por semana", description: "Evolução acelerada para exames e condicionamento" },
          { id: "daily", label: "4 ou mais vezes", description: "Dedicação máxima com participação em turmas extras" }
        ]
      }
    ],
    pushTitle: "Notificações de Treinos e Bancas",
    pushDescription: "Receba avisos quando a presença da sua aula for confirmada e saiba em primeira mão quando abrirem as inscrições para o exame de faixas.",
    primaryActionLabel: "Ver Minha Graduação e Treinos",
    primaryActionHref: "/aluno"
  },
  minor_student: {
    welcomeTitle: "Bem-vindo ao Dojang Ebener TKD!",
    welcomeSubtitle: "Aqui você acompanha suas faixas, seus treinos e aprende a disciplina dos campeões.",
    welcomeHighlight: "Jovem Atleta",
    ahaMomentDescription: "Veja sua faixa colorida brilhar no aplicativo e acompanhe sua evolução aula após aula.",
    benefitBullets: [
      { title: "Minhas Faixas", desc: "Veja a cor da sua faixa e qual é o próximo golpe ou poomsae a aprender." },
      { title: "Chamada dos Treinos", desc: "Confira todas as aulas que você participou com seu mestre." },
      { title: "Espírito Marcial", desc: "Aprenda respeito, foco, perseverança e autocontrole." }
    ],
    questions: [
      {
        id: "primaryFocus",
        title: "O que você mais gosta no Taekwondo?",
        options: [
          { id: "kicks", label: "Chutes e Golpes Voadores", description: "Aprender chutes altos e técnicas radicais" },
          { id: "poomsae", label: "Formas e Poomsae", description: "Movimentos perfeitos e equilíbrio do corpo" },
          { id: "games", label: "Treinar com meus Amigos", description: "Jogos e exercícios divertidos na aula" }
        ]
      }
    ],
    pushTitle: "Lembretes dos Treinos",
    pushDescription: "Ative para não esquecer o horário do seu dojang e se preparar com o dobok impecável!",
    primaryActionLabel: "Entrar no Dojang",
    primaryActionHref: "/aluno"
  },
  guardian: {
    welcomeTitle: "Portal da Família Ebener TKD",
    welcomeSubtitle: "Acompanhe de perto a segurança, o desenvolvimento e as conquistas marciais do seu dependente.",
    welcomeHighlight: "Responsável pelo Aluno",
    ahaMomentDescription: "Saiba exatamente quando seu dependente chega e conclui a aula, com transparência total da academia.",
    benefitBullets: [
      { title: "Presença em Tempo Real", desc: "Saiba quando a chamada foi concluída pelo professor na aula." },
      { title: "Acompanhamento da Graduação", desc: "Veja a evolução das faixas e a data prevista para o exame de graduação." },
      { title: "Facilidade de Pagamento", desc: "Chave PIX e envio de comprovante com baixa rápida sem fila." }
    ],
    questions: [
      {
        id: "primaryFocus",
        title: "O que é mais importante para você acompanhar no app?",
        options: [
          { id: "attendance_safety", label: "Segurança e Confirmação de Presença", description: "Saber que o aluno está treinando assiduamente" },
          { id: "belt_progress", label: "Evolução Marcial e Disciplina", description: "Acompanhar datas de exames, aptidão e troca de faixa" },
          { id: "financial_ease", label: "Praticidade Financeira", description: "Receber lembretes amigáveis e pagar via PIX em segundos" }
        ]
      },
      {
        id: "frequency",
        title: "Como prefere receber resumos de atividade?",
        options: [
          { id: "instant", label: "Alertas Imediatos a cada aula", description: "Notificação assim que a presença for lançada" },
          { id: "weekly", label: "Resumo Semanal Consolidado", description: "Visão geral das aulas e avisos da semana" }
        ]
      }
    ],
    pushTitle: "Alertas de Presença e Mensalidade",
    pushDescription: "Receba aviso no celular assim que a chamada do treino for feita no dojang e lembretes amigáveis de vencimento.",
    primaryActionLabel: "Acessar Ficha do Dependente",
    primaryActionHref: "/responsavel"
  }
};
