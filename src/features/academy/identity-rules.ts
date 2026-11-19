import { DEFAULT_ACADEMY_IDENTITY, type AcademyIdentity } from "@/features/academy/defaults";
import { formatDocument } from "@/features/academy/validators";

export type AcademyIdentityRow = Partial<Record<keyof AcademyIdentity, unknown>> & { $id?: string; revision?: number };

/** Identidade resolvida: campos obrigatórios sempre preenchidos; `configured` diz se há linha salva. */
export type ResolvedAcademyIdentity = AcademyIdentity & { revision: number; configured: boolean };

/** Nomes que o cliente (sidebar, PWA, login) precisa. Nunca leva documento nem contatos. */
export type AcademyBrand = { shortName: string; displayName: string };

export const DEFAULT_ACADEMY_BRAND: AcademyBrand = {
  shortName: DEFAULT_ACADEMY_IDENTITY.short_name,
  displayName: DEFAULT_ACADEMY_IDENTITY.display_name
};

const REQUIRED_TEXT = ["legal_name", "display_name", "short_name"] as const;

/**
 * Mistura a linha salva sobre os defaults, campo a campo. Linha ausente ou campo vazio/inválido
 * cai no default atual do código: o app sempre renderiza.
 */
export function resolveAcademyIdentity(row: AcademyIdentityRow | null | undefined): ResolvedAcademyIdentity {
  const resolved: Record<string, unknown> = { ...DEFAULT_ACADEMY_IDENTITY };
  if (row) {
    for (const key of Object.keys(DEFAULT_ACADEMY_IDENTITY) as Array<keyof AcademyIdentity>) {
      const value = row[key];
      if (value === undefined) continue;
      if ((REQUIRED_TEXT as readonly string[]).includes(key)) {
        if (typeof value === "string" && value.trim()) resolved[key] = value.trim();
      } else if (key === "theme_color") {
        if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) resolved[key] = value.toLowerCase();
      } else if (key === "timezone") {
        // Somente leitura neste ciclo: sempre o fuso de negócio do código.
        resolved[key] = DEFAULT_ACADEMY_IDENTITY.timezone;
      } else if (value === null || typeof value === "string") {
        resolved[key] = value === "" ? null : value;
      }
    }
  }
  return { ...(resolved as AcademyIdentity), revision: typeof row?.revision === "number" ? row.revision : 0, configured: Boolean(row) };
}

export function toBrand(identity: Pick<AcademyIdentity, "short_name" | "display_name">): AcademyBrand {
  return { shortName: identity.short_name, displayName: identity.display_name };
}

/** "Mestre Ebener Santos"; sem título, só o nome; sem nome, `fallback`. */
export function professorLabel(identity: Pick<AcademyIdentity, "professor_name" | "professor_title">, fallback = ""): string {
  const name = identity.professor_name?.trim();
  if (!name) return fallback;
  const title = identity.professor_title?.trim();
  return title ? `${title} ${name}` : name;
}

/**
 * Assinatura do reajuste: só usa a identidade quando o professor já a configurou; antes disso
 * mantém o comportamento anterior (nome do administrador logado).
 */
export function professorSignature(identity: ResolvedAcademyIdentity, adminFullName: string): string {
  if (identity.configured && identity.professor_name?.trim()) return professorLabel(identity);
  return adminFullName;
}

export function identityCity(identity: Pick<AcademyIdentity, "address_city" | "address_state">): string | null {
  const city = identity.address_city?.trim();
  if (!city) return null;
  return identity.address_state ? `${city}/${identity.address_state}` : city;
}

export function identityAddress(identity: AcademyIdentity): string | null {
  const parts = [identity.address_line, identity.address_complement, identity.address_district, identityCity(identity)]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

export function identityDocumentLabel(identity: Pick<AcademyIdentity, "document_type" | "document_number">): string | null {
  if (!identity.document_type || !identity.document_number) return null;
  return `${identity.document_type.toUpperCase()} ${formatDocument(identity.document_type, identity.document_number)}`;
}

/** Pendências de cadastro para o cartão da visão geral. */
export function identityChecklist(identity: ResolvedAcademyIdentity) {
  return [
    { id: "document", label: "CNPJ ou CPF da academia", done: Boolean(identity.document_number) },
    { id: "contact", label: "Contato de privacidade (LGPD)", done: Boolean(identity.privacy_contact || identity.contact_email || identity.phone_whatsapp) },
    { id: "address", label: "Endereço da academia", done: Boolean(identity.address_line && identity.address_city) },
    { id: "professor", label: "Nome do professor", done: Boolean(identity.professor_name) }
  ];
}
