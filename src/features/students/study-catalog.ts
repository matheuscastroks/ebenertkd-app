export type StudyQuizQuestion = {
  id: string;
  question: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

export type BeltStudyModule = {
  gub: number;
  belt: string;
  poomsae: string;
  trigram: string;
  meaning: string;
  movements: number;
  focusPoints: readonly string[];
  keyTechniques: readonly string[];
  quiz: readonly StudyQuizQuestion[];
};

export const BELT_STUDY_MODULES: readonly BeltStudyModule[] = [
  {
    gub: 10,
    belt: "Branca",
    poomsae: "Introductory Poomsae",
    trigram: "Fundamentos (Início)",
    meaning: "Pureza e início da jornada: mente aberta para aprender disciplina, postura e equilíbrio.",
    movements: 16,
    focusPoints: [
      "Manter postura firme nas bases básicas (Juchum Seogi e Ap Seogi).",
      "Controlar a respiração e o olhar na direção do movimento.",
      "Executar o Kihap com energia nos momentos finais.",
    ],
    keyTechniques: ["Arae Makgi (defesa baixa)", "Momtong Jireugi (soco médio)", "Ap Chagi (chute frontal)"],
    quiz: [
      {
        id: "g10-q1",
        question: "O que simboliza a faixa Branca no Taekwondo?",
        options: [
          "Domínio completo das lutas",
          "Início da jornada e mente aberta para aprender",
          "Nível intermediário de competição",
          "Especialização em quebramento",
        ],
        correctIndex: 1,
        explanation: "A faixa branca representa o ponto de partida, pureza e disposição para aprender os fundamentos.",
      },
      {
        id: "g10-q2",
        question: "Qual comando significa 'Sentido' (atenção) no início da aula?",
        options: ["Shijak", "Kyeongnye", "Charyeot", "Baro"],
        correctIndex: 2,
        explanation: "Charyeot é o comando de sentido/atenção antes da saudação (Kyeongnye).",
      },
    ],
  },
  {
    gub: 9,
    belt: "Ponta Amarela",
    poomsae: "Preliminary Poomsae",
    trigram: "Semente da Técnica",
    meaning: "Transição para as primeiras combinações de defesa, avanço e chutes controlados.",
    movements: 18,
    focusPoints: [
      "Coordenar a puxada do punho na cintura (Hikite / recuo de mão).",
      "Girar corretamente o pé de apoio nos deslocamentos.",
      "Manter altura constante do quadril durante os passos.",
    ],
    keyTechniques: ["Momtong An Makgi (defesa média)", "Ap Kubi (base longa)", "Bandal Chagi (chute semicircular baixo)"],
    quiz: [
      {
        id: "g9-q1",
        question: "Qual o nome do chute frontal clássico no Taekwondo?",
        options: ["Yeop Chagi", "Ap Chagi", "Dwit Chagi", "Naeryo Chagi"],
        correctIndex: 1,
        explanation: "Ap significa frente e Chagi significa chute: Ap Chagi é o chute frontal.",
      },
      {
        id: "g9-q2",
        question: "Qual comando indica 'Começar' um exercício ou Poomsae?",
        options: ["Geuman", "Shieo", "Shijak", "Joonbi"],
        correctIndex: 2,
        explanation: "Shijak significa começar; Geuman significa parar.",
      },
    ],
  },
  {
    gub: 8,
    belt: "Amarela",
    poomsae: "Taegeuk Il Jang",
    trigram: "Geon (Céu e Luz)",
    meaning: "Simboliza o céu e a luz — a origem da criação e o início da série oficial Taegeuk.",
    movements: 18,
    focusPoints: [
      "Diferenciar claramente passo curto (Ap Seogi) e passo longo (Ap Kubi).",
      "Executar defesa alta (Olgul Makgi) protegendo acima da cabeça sem bloquear a visão.",
      "Encaixar o Ap Chagi com recolhimento rápido antes de apoiar o pé à frente.",
    ],
    keyTechniques: ["Olgul Makgi (defesa alta)", "Ap Chagi seguido de Momtong Jireugi", "Ap Kubi firme"],
    quiz: [
      {
        id: "g8-q1",
        question: "Qual trigrama representa o Taegeuk Il Jang (1º Taegeuk)?",
        options: ["Água (Gam)", "Céu e Luz (Geon)", "Vento (Seon)", "Montanha (Gan)"],
        correctIndex: 1,
        explanation: "Geon representa o céu e a luz, início de toda a criação na filosofia do I Ching.",
      },
      {
        id: "g8-q2",
        question: "Quantos movimentos possui o Taegeuk Il Jang?",
        options: ["12 movimentos", "18 movimentos", "24 movimentos", "30 movimentos"],
        correctIndex: 1,
        explanation: "O Taegeuk Il Jang possui exatamente 18 movimentos.",
      },
    ],
  },
  {
    gub: 7,
    belt: "Ponta Verde",
    poomsae: "Taegeuk Ee Jang",
    trigram: "Tae (Alegria / Lago)",
    meaning: "Serenidade externa com firmeza interna, como a superfície calma de um lago.",
    movements: 18,
    focusPoints: [
      "Controlar o ritmo suave nas transições e explosivo no impacto final.",
      "Executar soco alto (Olgul Jireugi) na linha exata do rosto.",
      "Manter equilíbrio no giro de 180º após os chutes frontais.",
    ],
    keyTechniques: ["Olgul Jireugi (soco alto)", "Sequências de Ap Chagi + soco", "Dollyo Chagi (chute circular)"],
    quiz: [
      {
        id: "g7-q1",
        question: "O que simboliza o trigrama Tae do Taegeuk Ee Jang?",
        options: ["Fogo", "Alegria e serenidade interior", "Trovão", "Terra"],
        correctIndex: 1,
        explanation: "Tae simboliza alegria e serenidade: firme por dentro e gentil por fora.",
      },
    ],
  },
  {
    gub: 6,
    belt: "Verde",
    poomsae: "Taegeuk Sam Jang",
    trigram: "Ri (Fogo e Sol)",
    meaning: "Calor, energia e crescimento contínuo: a técnica ganha variedade e velocidade.",
    movements: 20,
    focusPoints: [
      "Executar Sonnal Mok Chigi (ataque de faca da mão no pescoço) com alinhamento preciso.",
      "Marcar claramente a base Dwit Kubi (base traseira) com peso 70/30.",
      "Controlar a dupla sequência de socos (Dubeon Jireugi).",
    ],
    keyTechniques: ["Sonnal Makgi (defesa com faca da mão)", "Sonnal Mok Chigi", "Dwit Kubi (base traseira)"],
    quiz: [
      {
        id: "g6-q1",
        question: "Qual elemento simboliza o Taegeuk Sam Jang?",
        options: ["Fogo e Sol (Ri)", "Vento (Seon)", "Montanha (Gan)", "Água (Gam)"],
        correctIndex: 0,
        explanation: "Ri simboliza o fogo e o sol, transmitindo energia, vitalidade e paixão pelo treino.",
      },
    ],
  },
  {
    gub: 5,
    belt: "Ponta Azul",
    poomsae: "Taegeuk Sa Jang",
    trigram: "Jin (Trovão)",
    meaning: "Força e coragem frente ao desafio: movimentos decididos e firmes como o trovão.",
    movements: 20,
    focusPoints: [
      "Dominar o Yeop Chagi (chute lateral) com o pé de apoio bem rotacionado.",
      "Executar Pyeonsonkeut Sewo Jireugi (estocada com ponta dos dedos) com controle.",
      "Fazer a defesa Jebipoom Mok Chigi com sincronia entre defesa alta e ataque.",
    ],
    keyTechniques: ["Yeop Chagi (chute lateral)", "Sonnal Momtong Makgi", "Jebipoom Mok Chigi"],
    quiz: [
      {
        id: "g5-q1",
        question: "Qual chute lateral é destaque técnico a partir do Taegeuk Sa Jang?",
        options: ["Ap Chagi", "Yeop Chagi", "Naeryo Chagi", "Bandal Chagi"],
        correctIndex: 1,
        explanation: "Yeop Chagi é o chute lateral, exigindo forte rotação do pé de apoio e quadril alinhado.",
      },
    ],
  },
  {
    gub: 4,
    belt: "Azul",
    poomsae: "Taegeuk Oh Jang",
    trigram: "Seon (Vento)",
    meaning: "Alternância entre suavidade e intensidade, como o vento que ora é brisa, ora tempestade.",
    movements: 20,
    focusPoints: [
      "Executar Me Jumeok Naeryo Chigi (golpe descendente com martelo do punho).",
      "Combinar Yeop Chagi com Palkup Pyojeok Chigi (cotovelada no alvo).",
      "Manter precisão na base Kkoa Seogi (base cruzada) no encerramento.",
    ],
    keyTechniques: ["Palkup Dollyo Chigi (cotovelada circular)", "Me Jumeok Chigi", "Kkoa Seogi (base cruzada)"],
    quiz: [
      {
        id: "g4-q1",
        question: "O que caracteriza o simbolismo do vento (Seon) no Taegeuk Oh Jang?",
        options: [
          "Apenas movimentos lentos",
          "Alternância entre movimentos suaves e fortes",
          "Apenas chutes saltados",
          "Ausência de bases longas",
        ],
        correctIndex: 1,
        explanation: "O vento alterna calma e potência, refletido no ritmo variado do Taegeuk Oh Jang.",
      },
    ],
  },
  {
    gub: 3,
    belt: "Ponta Vermelha",
    poomsae: "Taegeuk Yuk Jang",
    trigram: "Gam (Água)",
    meaning: "Fluidez contínua e adaptação: contornar obstáculos sem perder a direção.",
    movements: 19,
    focusPoints: [
      "Executar Batangson Momtong Makgi com a palma da mão firme e ângulo correto.",
      "Realizar o Dollyo Chagi alto com giro completo de quadril.",
      "Manter a cadência lenta e controlada no Arae Hechyo Makgi.",
    ],
    keyTechniques: ["Batangson Makgi (defesa com a base da palma)", "Dollyo Chagi alto", "Olgul Bakkat Makgi"],
    quiz: [
      {
        id: "g3-q1",
        question: "Qual elemento representa o Taegeuk Yuk Jang (6º Taegeuk)?",
        options: ["Fogo", "Montanha", "Água (Gam)", "Terra"],
        correctIndex: 2,
        explanation: "Gam simboliza a água: fluxo contínuo, adaptabilidade e persistência.",
      },
    ],
  },
  {
    gub: 2,
    belt: "Vermelha",
    poomsae: "Taegeuk Chil Jang",
    trigram: "Gan (Montanha)",
    meaning: "Estabilidade e autocontrole: saber avançar com força e parar com firmeza.",
    movements: 25,
    focusPoints: [
      "Executar Beom Seogi (base do tigre) com leveza no pé da frente e estabilidade atrás.",
      "Dominar Pyojeok Chagi (chute batendo na palma) e Mureup Chigi (joelhada).",
      "Demonstrar controle máximo na base Juchum Seogi no fechamento.",
    ],
    keyTechniques: ["Beom Seogi (base do tigre)", "Batangson Geodeureo Makgi", "Bo Jumeok (punho coberto)"],
    quiz: [
      {
        id: "g2-q1",
        question: "Qual base característica é introduzida com destaque no Taegeuk Chil Jang?",
        options: ["Beom Seogi (base do tigre)", "Ap Seogi", "Naranhi Seogi", "Moa Seogi"],
        correctIndex: 0,
        explanation: "Beom Seogi (base do tigre) concentra o peso na perna traseira para máxima agilidade.",
      },
    ],
  },
  {
    gub: 1,
    belt: "Ponta Preta",
    poomsae: "Taegeuk Pal Jang",
    trigram: "Gon (Terra)",
    meaning: "Maturidade dos fundamentos coloridos: a terra que sustenta tudo antes do novo começo na Faixa Preta.",
    movements: 27,
    focusPoints: [
      "Executar o salto de Dubal Dangsang Ap Chagi com aterrissagem firme e equilibrada.",
      "Consolidar todas as bases (Ap Kubi, Dwit Kubi, Beom Seogi) com precisão.",
      "Demonstrar espírito de liderança, etiqueta impecável e controle emocional.",
    ],
    keyTechniques: ["Dubal Dangsang Ap Chagi (chute frontal duplo saltado)", "Oe Santeul Makgi", "Danggyeo Teok Jireugi"],
    quiz: [
      {
        id: "g1-q1",
        question: "Qual trigrama encerra a série Taegeuk no Taegeuk Pal Jang?",
        options: ["Céu (Geon)", "Terra (Gon)", "Trovão (Jin)", "Lago (Tae)"],
        correctIndex: 1,
        explanation: "Gon representa a terra, completando o ciclo dos 8 trigramas das faixas coloridas.",
      },
    ],
  },
  {
    gub: 0,
    belt: "Preta",
    poomsae: "Koryo",
    trigram: "Seonbae (Espírito do Mestre / Dinastia Koryo)",
    meaning: "Novo começo em nível superior: foco em refinamento técnico, espírito indomável e exemplo para o dojang.",
    movements: 30,
    focusPoints: [
      "Executar o Geodeup Yeop Chagi (chute lateral duplo baixo/alto) com fluidez.",
      "Manter postura de liderança, precisão nas respirações e equilíbrio perfeito.",
      "Aprofundar o ensino e apoio aos colegas de graduações iniciais.",
    ],
    keyTechniques: ["Geodeup Yeop Chagi", "Kaljaebi (ataque em arco de mão)", "Tongmilgi (empurrão controlado)"],
    quiz: [
      {
        id: "g0-q1",
        question: "Qual é o primeiro Poomsae oficial de Faixa Preta (1º Dan) na Kukkiwon?",
        options: ["Keumgang", "Taebaek", "Koryo", "Pyongwon"],
        correctIndex: 2,
        explanation: "Koryo é o Poomsae oficial de 1º Dan, seguido por Keumgang (2º Dan) e Taebaek (3º Dan).",
      },
    ],
  },
];

export const KOREAN_COMMANDS = [
  { term: "Charyeot", meaning: "Sentido (atenção)" },
  { term: "Kyeongnye", meaning: "Saudação (cumprimentar)" },
  { term: "Joonbi", meaning: "Posição de preparo" },
  { term: "Shijak", meaning: "Começar" },
  { term: "Geuman", meaning: "Parar / encerrar" },
  { term: "Baro", meaning: "Voltar à posição inicial" },
  { term: "Shieo", meaning: "Descansar" },
  { term: "Dwiro Dora", meaning: "Meia-volta" },
  { term: "Kihap", meaning: "Grito de energia e foco" },
  { term: "Sabumnim", meaning: "Mestre / Professor (4º Dan+)" },
  { term: "Kyosanim", meaning: "Instrutor" },
  { term: "Dojang", meaning: "Local de treino (espaço do caminho)" },
  { term: "Dobok", meaning: "Uniforme oficial de Taekwondo" },
] as const;

export const KOREAN_NUMBERS = [
  { number: 1, term: "Hana" },
  { number: 2, term: "Dul" },
  { number: 3, term: "Set" },
  { number: 4, term: "Net" },
  { number: 5, term: "Dasot" },
  { number: 6, term: "Yosot" },
  { number: 7, term: "Ilgop" },
  { number: 8, term: "Yodol" },
  { number: 9, term: "Ahop" },
  { number: 10, term: "Yol" },
] as const;

export const TAEKWONDO_TENETS = [
  {
    korean: "Ye Ui",
    name: "Cortesia",
    description: "Respeitar mestres, colegas e o espaço de treino com educação e humildade.",
  },
  {
    korean: "Yom Chi",
    name: "Integridade",
    description: "Reconhecer o certo e o errado, assumindo responsabilidade pelas próprias atitudes.",
  },
  {
    korean: "In Nae",
    name: "Perseverança",
    description: "Continuar treinando e superando dificuldades com paciência e consistência.",
  },
  {
    korean: "Guk Gi",
    name: "Autocontrole",
    description: "Controlar força física e emoções dentro e fora do dojang.",
  },
  {
    korean: "Baekjul Boolgool",
    name: "Espírito Indomável",
    description: "Agir com coragem e justiça diante dos desafios, sem desistir dos seus valores.",
  },
] as const;

export type StudyModuleAccessState = "current" | "review" | "preview";

export type AnnotatedStudyModule = BeltStudyModule & {
  accessState: StudyModuleAccessState;
};

export function getStudyModulesForGub(currentGub: number): AnnotatedStudyModule[] {
  return BELT_STUDY_MODULES.map((mod) => {
    let accessState: StudyModuleAccessState = "preview";
    if (mod.gub === currentGub) {
      accessState = "current";
    } else if (mod.gub > currentGub) {
      accessState = "review";
    }
    return { ...mod, accessState };
  });
}
