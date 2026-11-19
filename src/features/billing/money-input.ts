import { reaisToCents } from "@/lib/money";

/** Converte o texto digitado em reais ("1.500,50" ou "1500.5") para centavos; vazio ou inválido vira 0. */
export function parseMoneyInput(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  try {
    return reaisToCents(trimmed);
  } catch {
    return 0;
  }
}

/** Converte "4,5" ou "4.5" em número; vazio ou inválido vira 0. */
export function parseNumberInput(text: string) {
  const value = Number(text.trim().replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export function parseIntegerInput(text: string) {
  return Math.max(0, Math.trunc(parseNumberInput(text)));
}

/** Valor em reais para preencher um campo de texto (vírgula decimal, sem milhar). */
export function centsToInput(cents: number) {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
