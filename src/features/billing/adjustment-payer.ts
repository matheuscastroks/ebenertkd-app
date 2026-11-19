/** Escolha do contato do pagador. Função pura: nada aqui é registrado em log. */

const PHONE_PATTERN = /(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/;

/** Extrai o primeiro telefone brasileiro de um texto livre (ex.: "Maria - (11) 99999-8888"). */
export function extractPhone(text?: string | null): string | null {
  if (!text) return null;
  const match = PHONE_PATTERN.exec(text);
  return match ? match[0].replace(/\D/g, "") : null;
}

/**
 * Menor de idade: o aviso vai para o responsável (telefone do contato do responsável na ficha).
 * Adulto: o próprio aluno. Sem telefone utilizável, a linha aparece sem botão de WhatsApp.
 */
export function pickPayerPhone(input: { isMinor: boolean; whatsapp?: string | null; guardianContact?: string | null }) {
  if (input.isMinor) return extractPhone(input.guardianContact) ?? null;
  return input.whatsapp?.replace(/\D/g, "") || null;
}
