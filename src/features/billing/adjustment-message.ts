/** Modelos de mensagem do reajuste e montagem segura do link wa.me. Funções puras. */

import { netFeeCents } from "@/features/billing/adjustment-rules";
import { formatBusinessDateBr } from "@/lib/dates";
import { formatBrl } from "@/lib/money";

export const ACADEMY_NAME = "Ebener TKD";

export const MESSAGE_VARIABLES = [
  "nome",
  "nome_aluno",
  "valor_atual",
  "valor_novo",
  "diferenca",
  "vigencia",
  "indice",
  "academia",
  "professor"
] as const;

export type MessageVariable = (typeof MESSAGE_VARIABLES)[number];

export type MessageTemplateId = "cordial" | "curto" | "transparencia" | "responsaveis";

export type MessageTemplate = { id: MessageTemplateId; label: string; description: string; body: string };

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "cordial",
    label: "Cordial padrão",
    description: "Agradece, explica o motivo em uma frase e abre espaço para conversa.",
    body: [
      "Olá, {nome}! Tudo bem? 🥋",
      "Primeiro, obrigado por fazer parte da {academia}. Ver a evolução de {nome_aluno} nos treinos é o que move a gente.",
      "Quero te avisar com antecedência que, a partir de {vigencia}, a mensalidade passará de {valor_atual} para {valor_novo}. O reajuste acompanha a inflação do período ({indice}) e os custos de manter o espaço, os equipamentos e a qualidade das aulas.",
      "O novo valor passa a valer na renovação do seu contrato, que também ficará disponível para assinatura pelo app.",
      "Se quiser conversar sobre isso, é só me chamar aqui. Conte sempre comigo!",
      "{professor}"
    ].join("\n")
  },
  {
    id: "curto",
    label: "Curto e direto",
    description: "Três linhas: o aviso, a data e o convite para conversar.",
    body: [
      "Olá, {nome}! Passando para avisar que, a partir de {vigencia}, a mensalidade de {nome_aluno} passa de {valor_atual} para {valor_novo} (renovação do contrato).",
      "Qualquer dúvida, é só me chamar. Obrigado por treinar com a gente!",
      "{professor} · {academia}"
    ].join("\n")
  },
  {
    id: "transparencia",
    label: "Com transparência de custos",
    description: "Explica o que subiu: aluguel, energia, material e manutenção.",
    body: [
      "Olá, {nome}! Tudo bem? 🥋",
      "Obrigado por fazer parte da {academia}. Quero ser transparente com você: nos últimos meses subiram o aluguel, a energia, o material de treino e a manutenção dos tatames, e isso pesa para manter a qualidade das aulas.",
      "Por isso, a partir de {vigencia}, a mensalidade de {nome_aluno} passará de {valor_atual} para {valor_novo} (diferença de {diferenca} por mês). Referência usada: {indice}.",
      "O novo valor vale a partir da renovação do contrato, que ficará disponível para assinatura pelo app.",
      "Se preferir conversar, estou à disposição. Obrigado pela confiança!",
      "{professor}"
    ].join("\n")
  },
  {
    id: "responsaveis",
    label: "Para responsáveis",
    description: "Fala do filho ou da filha e valoriza o desenvolvimento no tatame.",
    body: [
      "Olá, {nome}! Tudo bem? 🥋",
      "Obrigado por confiar à {academia} a formação de {nome_aluno}. Acompanhar o crescimento dele(a) dentro e fora do tatame é o que nos motiva.",
      "Aviso com antecedência que, a partir de {vigencia}, a mensalidade passará de {valor_atual} para {valor_novo}. O reajuste acompanha a inflação do período ({indice}) e os custos de manter um espaço seguro e de qualidade.",
      "O novo valor vale na renovação do contrato, que ficará disponível para você assinar pelo app.",
      "Se quiser conversar, é só me chamar por aqui. Conte comigo!",
      "{professor}"
    ].join("\n")
  }
];

export function getMessageTemplate(id: MessageTemplateId) {
  return MESSAGE_TEMPLATES.find((template) => template.id === id) ?? MESSAGE_TEMPLATES[0];
}

export type MessageVariables = Partial<Record<MessageVariable, string>>;

/** Variáveis `{nome}` desconhecidas são mantidas; as conhecidas sem valor viram texto vazio. */
export function interpolateMessage(template: string, variables: MessageVariables) {
  const filled = template.replace(/\{([a-z_]+)\}/g, (match, key: string) => {
    if (!(MESSAGE_VARIABLES as readonly string[]).includes(key)) return match;
    return variables[key as MessageVariable] ?? "";
  });
  return filled
    .replace(/[ \t]*\([ \t]*\)/g, "")
    .replace(/[ \t]*Referência usada:[ \t]*\./g, "")
    .replace(/ +\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Variáveis usadas no texto que não existem na lista suportada (ex.: erro de digitação). */
export function findUnknownVariables(template: string) {
  const unknown = new Set<string>();
  for (const match of template.matchAll(/\{([^{}\s]+)\}/g)) {
    if (!(MESSAGE_VARIABLES as readonly string[]).includes(match[1])) unknown.add(match[1]);
  }
  return [...unknown];
}

/** Texto codificado para `?text=` (quebras de linha, emojis, &, # e acentos). */
export function encodeWhatsappText(text: string) {
  return encodeURIComponent(text);
}

/** Acrescenta `?text=` ao link base `https://wa.me/55...`; sem link base, devolve null. */
export function buildWhatsappMessageLink(baseLink: string | null, text: string) {
  if (!baseLink) return null;
  const separator = baseLink.includes("?") ? "&" : "?";
  return `${baseLink}${separator}text=${encodeWhatsappText(text)}`;
}

/** Limite prático para links wa.me abrirem sem truncar em navegadores e aplicativos. */
export const WHATSAPP_LINK_SOFT_LIMIT = 1800;

export function isLongForWhatsappLink(text: string) {
  return encodeWhatsappText(text).length > WHATSAPP_LINK_SOFT_LIMIT;
}

/** Aviso geral (sem valores individuais) para publicar em /avisos. */
export function buildGenericNotice(input: { academy: string; effectiveFromLabel: string; indexLabel?: string }) {
  const reason = input.indexLabel?.trim()
    ? `O ajuste acompanha a inflação do período (${input.indexLabel.trim()}) e os custos de manter o espaço e a qualidade das aulas.`
    : "O ajuste acompanha a inflação do período e os custos de manter o espaço e a qualidade das aulas.";
  return {
    title: "Reajuste de mensalidade",
    body: `Olá! A ${input.academy} vai reajustar as mensalidades a partir de ${input.effectiveFromLabel}, na renovação de cada contrato. ${reason} O valor de cada aluno será informado individualmente pelo professor. Qualquer dúvida, é só chamar.`
  };
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** Variáveis de um pagador. Valores em reais usam o que o aluno realmente paga (mensalidade menos desconto). */
export function buildMessageVariables(input: {
  payerName: string;
  studentName: string;
  previousFeeCents: number;
  newFeeCents: number;
  discountCents: number;
  effectiveFrom: string;
  indexLabel?: string | null;
  professor?: string;
  academy?: string;
}): MessageVariables {
  const previous = netFeeCents(input.previousFeeCents, input.discountCents);
  const next = netFeeCents(input.newFeeCents, input.discountCents);
  return {
    nome: firstName(input.payerName),
    nome_aluno: firstName(input.studentName),
    valor_atual: formatBrl(previous),
    valor_novo: formatBrl(next),
    diferenca: formatBrl(Math.max(0, next - previous)),
    vigencia: formatBusinessDateBr(input.effectiveFrom),
    indice: input.indexLabel?.trim() ?? "",
    academia: input.academy ?? ACADEMY_NAME,
    professor: input.professor?.trim() ?? ""
  };
}
