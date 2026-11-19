import { isValidCpf } from "@/lib/auth/auth-utils";
import type { DocumentType } from "@/features/academy/defaults";

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const digit = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + weight * Number(cnpj[index]), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

export function isValidDocument(type: DocumentType, value: string) {
  return type === "cnpj" ? isValidCnpj(value) : isValidCpf(value);
}

export function formatDocument(type: DocumentType | null | undefined, value: string | null | undefined) {
  const digits = onlyDigits(value ?? "");
  if (type === "cnpj" && digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (type === "cpf" && digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return digits;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string) {
  return HEX_COLOR.test(value);
}

export function normalizeHexColor(value: string) {
  return value.trim().toLowerCase();
}

/** Razão de contraste WCAG entre duas cores hex `#rrggbb`. */
export function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
    const [r, g, b] = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
