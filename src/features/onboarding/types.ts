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
    welcomeTitle: "Bem-vindo à Ebener TKD",
    welcomeSubtitle: "Gerencie turmas, matrículas, exames de faixa e cobranças em um só lugar.",
    welcomeHighlight: "Mestre Ebener Santos",
    ahaMomentDescription: "Faça a chamada, confira comprovantes PIX e organize os exames de faixa.",
    benefitBullets: [
      { title: "Chamada das aulas", desc: "Registre a presença de uma turma inteira em poucos toques." },
      { title: "Exames de faixa", desc: "Veja os candidatos por faixa e registre o resultado." },
      { title: "Financeiro", desc: "Acompanhe mensalidades e confira os comprovantes PIX." }
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
    pushTitle: "Avisos da secretaria",
    pushDescription: "Receba um aviso quando chegar um comprovante PIX ou uma nova matrícula.",
    primaryActionLabel: "Ir para o painel",
    primaryActionHref: "/admin"
  },
  adult_student: {
    welcomeTitle: "Bem-vindo à Ebener TKD",
    welcomeSubtitle: "Acompanhe seus treinos, sua frequência e a evolução das suas faixas.",
    welcomeHighlight: "Praticante de Taekwondo",
    ahaMomentDescription: "Veja seu próximo treino, sua faixa atual e o que falta para o próximo exame.",
    benefitBullets: [
      { title: "Minha faixa", desc: "Veja sua graduação atual, o poomsae e o próximo exame." },
      { title: "Frequência", desc: "Histórico das suas presenças e próximos treinos." },
      { title: "Financeiro e contratos", desc: "Pague mensalidades por PIX e assine contratos pelo app." }
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
    pushTitle: "Avisos de treino e exame",
    pushDescription: "Receba avisos de aula, mensalidade e exames de faixa neste aparelho.",
    primaryActionLabel: "Ver meus treinos",
    primaryActionHref: "/aluno"
  },
  minor_student: {
    welcomeTitle: "Bem-vindo à Ebener TKD",
    welcomeSubtitle: "Aqui você acompanha seus treinos e a evolução das suas faixas.",
    welcomeHighlight: "Jovem Atleta",
    ahaMomentDescription: "Veja sua faixa atual e as aulas de que você participou.",
    benefitBullets: [
      { title: "Minha faixa", desc: "Veja a cor da sua faixa e o próximo poomsae." },
      { title: "Presenças", desc: "Confira as aulas de que você participou." },
      { title: "Mensagens da academia", desc: "Veja os avisos do professor e da secretaria." }
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
    pushTitle: "Lembretes de treino",
    pushDescription: "Ative para não esquecer o horário das suas aulas.",
    primaryActionLabel: "Ir para o painel",
    primaryActionHref: "/aluno"
  },
  guardian: {
    welcomeTitle: "Portal da família",
    welcomeSubtitle: "Acompanhe a presença, as faixas e as mensalidades de quem você acompanha.",
    welcomeHighlight: "Responsável pelo Aluno",
    ahaMomentDescription: "Veja as presenças, a faixa e as pendências de cada dependente.",
    benefitBullets: [
      { title: "Presença", desc: "Veja quando o professor registrou a chamada da aula." },
      { title: "Graduação", desc: "Veja a faixa atual e a data do próximo exame." },
      { title: "Pagamentos", desc: "Pague por PIX e envie o comprovante pelo app." }
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
    pushTitle: "Avisos de presença e mensalidade",
    pushDescription: "Receba avisos de presença e lembretes de vencimento neste aparelho.",
    primaryActionLabel: "Ver meus dependentes",
    primaryActionHref: "/responsavel"
  }
};
