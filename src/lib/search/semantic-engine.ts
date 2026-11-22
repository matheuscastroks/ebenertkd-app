import type { SearchResultItem, SearchScreenItem } from "@/lib/search/types";

const STOPWORDS = new Set([
  "a",
  "o",
  "e",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "para",
  "por",
  "com",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "os",
  "as",
  "um",
  "uma",
  "ver",
  "ir",
  "abrir",
  "meu",
  "minha",
  "meus",
  "minhas",
  "como",
  "onde",
  "quero",
  "sobre",
  "que",
]);

const SYNONYM_GROUPS: readonly (readonly string[])[] = [
  [
    "financeiro",
    "mensalidade",
    "boleto",
    "pix",
    "cobranca",
    "cobrancas",
    "inadimplencia",
    "inadimplente",
    "atraso",
    "atrasado",
    "pagamento",
    "pagamentos",
    "pagar",
    "recibo",
    "dinheiro",
    "taxa",
    "valor",
    "valores",
    "fatura",
    "vencimento",
    "debito",
  ],
  [
    "faixa",
    "faixas",
    "graduacao",
    "graduacoes",
    "gub",
    "dan",
    "exame",
    "exames",
    "evolucao",
    "progresso",
    "aptidao",
    "apto",
    "elegibilidade",
    "troca",
    "promocao",
    "subir",
    "cinturao",
  ],
  [
    "frequencia",
    "presenca",
    "presencas",
    "falta",
    "faltas",
    "chamada",
    "treino",
    "treinos",
    "aula",
    "aulas",
    "agenda",
    "calendario",
    "checkin",
    "retencao",
    "evasao",
    "desistencia",
    "sumido",
    "risco",
    "ausencia",
  ],
  [
    "aluno",
    "alunos",
    "matricula",
    "matriculas",
    "ficha",
    "fichas",
    "cadastro",
    "carteirinha",
    "documento",
    "documentos",
    "acesso",
    "acessos",
    "login",
    "senha",
    "credencial",
    "identificacao",
  ],
  [
    "saude",
    "parq",
    "par",
    "medico",
    "medica",
    "atestado",
    "questionario",
    "clinico",
    "aptidao",
    "emergencia",
  ],
  [
    "contrato",
    "contratos",
    "assinatura",
    "assinar",
    "renovacao",
    "renovar",
    "rematricula",
    "cancelamento",
    "cancelar",
    "rescisao",
    "rescindir",
    "modelo",
    "termo",
    "clausula",
  ],
  [
    "evento",
    "eventos",
    "campeonato",
    "campeonatos",
    "torneio",
    "seminario",
    "competicao",
    "inscricao",
    "inscricoes",
    "participar",
  ],
  [
    "turma",
    "turmas",
    "grade",
    "horario",
    "horarios",
    "local",
    "locais",
    "dojang",
    "unidade",
    "unidades",
    "endereco",
    "sala",
    "polo",
  ],
  [
    "estudo",
    "estudos",
    "poomsae",
    "apostila",
    "teoria",
    "material",
    "tecnica",
    "conquista",
    "conquistas",
    "medalha",
    "badge",
    "trofeu",
  ],
  [
    "familia",
    "responsavel",
    "filho",
    "filhos",
    "dependente",
    "dependentes",
    "menor",
    "menores",
    "crianca",
    "pais",
  ],
  [
    "aviso",
    "avisos",
    "notificacao",
    "notificacoes",
    "mensagem",
    "mensagens",
    "alerta",
    "alertas",
    "pendencia",
    "pendencias",
    "comunicado",
  ],
  [
    "ajuste",
    "ajustes",
    "configuracao",
    "configuracoes",
    "sistema",
    "tema",
    "conta",
    "perfil",
    "identidade",
    "marca",
    "logo",
    "regra",
    "regras",
    "politica",
    "backup",
    "armazenamento",
    "privacidade",
  ],
  [
    "relatorio",
    "relatorios",
    "balanco",
    "anual",
    "meta",
    "metas",
    "calculadora",
    "simular",
    "simulacao",
    "previsao",
    "faturamento",
    "reajuste",
    "fechamento",
    "caixa",
    "historico",
    "auditoria",
  ],
];

/** Normaliza texto em PT-BR removendo acentos, pontuação e espaços duplicados. */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSynonymMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalizeSearchText).filter(Boolean);
    for (const term of normalizedGroup) {
      let siblings = map.get(term);
      if (!siblings) {
        siblings = new Set<string>();
        map.set(term, siblings);
      }
      for (const other of normalizedGroup) {
        if (other !== term) {
          siblings.add(other);
        }
      }
    }
  }
  return map;
}

const SYNONYM_MAP = buildSynonymMap();

function tokenize(normalized: string): string[] {
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

/** Distância de Damerau-Levenshtein limitada por `maxDist` para tolerância a erros de digitação. */
export function damerauLevenshtein(a: string, b: string, maxDist = 2): number {
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;
  if (a === b) return 0;
  if (lenA === 0) return lenB <= maxDist ? lenB : maxDist + 1;
  if (lenB === 0) return lenA <= maxDist ? lenA : maxDist + 1;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    Array.from({ length: lenB + 1 }, () => 0)
  );

  for (let i = 0; i <= lenA; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lenB; j += 1) dp[0][j] = j;

  for (let i = 1; i <= lenA; i += 1) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lenB; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let cell = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cell = Math.min(cell, dp[i - 2][j - 2] + cost);
      }

      dp[i][j] = cell;
      if (cell < rowMin) rowMin = cell;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }

  return dp[lenA][lenB];
}

export type SearchCandidate = {
  title: string;
  subtitle?: string;
  section?: string;
  description?: string;
  keywords?: string[];
};

function matchesTokenOrPrefix(targetTokens: string[], queryToken: string): "exact" | "prefix" | null {
  let hasPrefix = false;
  for (const token of targetTokens) {
    if (token === queryToken) return "exact";
    if (queryToken.length >= 2 && token.startsWith(queryToken)) {
      hasPrefix = true;
    }
  }
  return hasPrefix ? "prefix" : null;
}

function bestFuzzyScore(targetTokens: string[], queryToken: string): number {
  if (queryToken.length < 4) return 0;
  const maxAllowed = queryToken.length >= 6 ? 2 : 1;
  let bestDist = maxAllowed + 1;

  for (const token of targetTokens) {
    if (token.length < 3) continue;
    const dist = damerauLevenshtein(queryToken, token, maxAllowed);
    if (dist < bestDist) {
      bestDist = dist;
    }
  }

  if (bestDist > maxAllowed) return 0;
  if (bestDist === 1) return 14;
  if (bestDist === 2) return 8;
  return 0;
}

/** Pontua um candidato de busca considerando frase completa, prefixo, sinônimos e fuzzy matching. */
export function scoreSearchCandidate(candidate: SearchCandidate, rawQuery: string): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return 0;

  const allQueryTokens = tokenize(normalizedQuery);
  const meaningfulTokens = allQueryTokens.filter((token) => !STOPWORDS.has(token));
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allQueryTokens;
  if (queryTokens.length === 0) return 0;

  const titleNorm = normalizeSearchText(candidate.title);
  const titleTokens = tokenize(titleNorm);

  const keywordNorms = (candidate.keywords ?? []).map(normalizeSearchText).filter(Boolean);
  const keywordTokens = keywordNorms.flatMap(tokenize);

  const metaNorm = normalizeSearchText(
    [candidate.section ?? "", candidate.subtitle ?? "", candidate.description ?? ""].join(" ")
  );
  const metaTokens = tokenize(metaNorm);

  let totalScore = 0;

  // Bônus por correspondência da frase completa no título ou nas palavras-chave.
  if (titleNorm === normalizedQuery) {
    totalScore += 120;
  } else if (titleNorm.startsWith(normalizedQuery)) {
    totalScore += 90;
  } else if (titleNorm.includes(normalizedQuery)) {
    totalScore += 70;
  } else if (keywordNorms.some((kw) => kw === normalizedQuery || kw.includes(normalizedQuery))) {
    totalScore += 65;
  }

  const fuzzyTargets = [...titleTokens, ...keywordTokens];
  const allTargets = [...titleTokens, ...keywordTokens, ...metaTokens];

  for (const queryToken of queryTokens) {
    let tokenScore = 0;

    const titleMatch = matchesTokenOrPrefix(titleTokens, queryToken);
    if (titleMatch === "exact") {
      tokenScore = Math.max(tokenScore, 50);
    } else if (titleMatch === "prefix") {
      tokenScore = Math.max(tokenScore, 36);
    }

    const keywordMatch = matchesTokenOrPrefix(keywordTokens, queryToken);
    if (keywordMatch === "exact") {
      tokenScore = Math.max(tokenScore, 42);
    } else if (keywordMatch === "prefix") {
      tokenScore = Math.max(tokenScore, 30);
    }

    const metaMatch = matchesTokenOrPrefix(metaTokens, queryToken);
    if (metaMatch) {
      tokenScore = Math.max(tokenScore, 22);
    }

    if (tokenScore < 16) {
      const synonyms = SYNONYM_MAP.get(queryToken);
      if (synonyms && allTargets.some((target) => synonyms.has(target))) {
        tokenScore = Math.max(tokenScore, 16);
      }
    }

    if (tokenScore === 0) {
      tokenScore = bestFuzzyScore(fuzzyTargets, queryToken);
    }

    // Todos os termos significativos precisam ter alguma correspondência.
    if (tokenScore === 0) return 0;
    totalScore += tokenScore;
  }

  return totalScore;
}

/** Busca no catálogo local de telas com ranking semântico leve. */
export function searchScreenCatalog(
  items: SearchScreenItem[],
  query: string,
  limit = 8
): SearchResultItem[] {
  if (!query.trim()) {
    return items.slice(0, limit).map((item) => ({
      id: item.id,
      kind: "screen",
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      icon: item.icon,
      badge: item.section,
    }));
  }

  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreSearchCandidate(item, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item, score }) => ({
      id: item.id,
      kind: "screen",
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      icon: item.icon,
      badge: item.section,
      score,
    }));
}
