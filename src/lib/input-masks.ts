import { formatCep } from "@/lib/address";
import { formatBrazilianPhone } from "@/lib/phone";

export type InputMaskType = "cpf" | "cnpj" | "cpf_cnpj" | "cep" | "phone" | "uf" | "none";

export type MaskDefaults = {
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
};

export const MASK_DEFAULTS: Record<InputMaskType, MaskDefaults> = {
  cpf: { placeholder: "000.000.000-00", inputMode: "numeric", maxLength: 14 },
  cnpj: { placeholder: "00.000.000/0000-00", inputMode: "numeric", maxLength: 18 },
  cpf_cnpj: { placeholder: "000.000.000-00", inputMode: "numeric", maxLength: 18 },
  cep: { placeholder: "00000-000", inputMode: "numeric", maxLength: 9 },
  phone: { placeholder: "(21) 9 6518-8988", inputMode: "tel", maxLength: 17 },
  uf: { placeholder: "RJ", inputMode: "text", maxLength: 2 },
  none: {},
};

/** Aplica máscara progressiva de CPF (`000.000.000-00`). */
export function formatCpfMask(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/** Aplica máscara progressiva de CNPJ (`00.000.000/0000-00`). */
export function formatCnpjMask(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/** Aplica máscara de CPF (até 11 dígitos) ou CNPJ (12 a 14 dígitos). */
export function formatCpfCnpjMask(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 14);
  return digits.length <= 11 ? formatCpfMask(digits) : formatCnpjMask(digits);
}

/** Mantém apenas letras em maiúsculo para sigla de UF (2 caracteres). */
export function formatStateUfMask(value?: string | null): string {
  return (value ?? "").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

export function applyInputMask(mask: InputMaskType, value?: string | null): string {
  const raw = value ?? "";
  switch (mask) {
    case "cpf":
      return formatCpfMask(raw);
    case "cnpj":
      return formatCnpjMask(raw);
    case "cpf_cnpj":
      return formatCpfCnpjMask(raw);
    case "cep":
      return formatCep(raw);
    case "phone":
      return formatBrazilianPhone(raw);
    case "uf":
      return formatStateUfMask(raw);
    default:
      return raw;
  }
}
