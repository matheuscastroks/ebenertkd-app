import type { EventRegistrationDocument } from "@/features/events/types";

export const DOCUMENT_KINDS = ["guardian_authorization", "responsibility_term", "medical", "federation_card", "other"] as const;

export const DOCUMENT_KIND_LABEL: Record<EventRegistrationDocument["kind"], string> = {
  guardian_authorization: "Autorização do responsável (assinada)",
  responsibility_term: "Termo de responsabilidade (assinado)",
  medical: "Atestado médico",
  federation_card: "Carteira da federação",
  other: "Outro documento"
};

export const DOCUMENT_STATUS_LABEL: Record<EventRegistrationDocument["status"], string> = { pending: "Em análise", approved: "Aprovado", rejected: "Recusado" };

export type ReadinessInput = {
  /** Atleta menor de idade (perfil `minor_student`). */
  isMinor: boolean;
  termsAcceptedAt?: string | null;
  guardianAuthorizedAt?: string | null;
  documents: ReadonlyArray<Pick<EventRegistrationDocument, "status" | "kind">>;
};

/**
 * Pendências para a professora confirmar o atleta e enviá-lo à federação.
 * Menor: autorização do responsável e termo aceitos no app. Todo documento enviado precisa estar aprovado
 * (pendente ou recusado bloqueia até a revisão).
 */
export function championshipReadiness(input: ReadinessInput): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.termsAcceptedAt) missing.push("termo de responsabilidade não aceito");
  if (input.isMinor && !input.guardianAuthorizedAt) missing.push("autorização do responsável pendente");
  const pending = input.documents.filter((document) => document.status === "pending").length;
  const rejected = input.documents.filter((document) => document.status === "rejected").length;
  if (pending) missing.push(pending === 1 ? "documento aguardando revisão" : `${pending} documentos aguardando revisão`);
  if (rejected) missing.push(rejected === 1 ? "documento recusado: precisa de novo envio" : `${rejected} documentos recusados: precisam de novo envio`);
  return { ready: missing.length === 0, missing };
}

/** Quem pode anexar documentos: o próprio aluno adulto, o responsável do menor ou a professora. O menor nunca envia. */
export function canUploadRegistrationDocument(input: { actorRole: string; isOwnerOrGuardian: boolean }) {
  if (input.actorRole === "admin") return true;
  if (input.actorRole === "minor_student") return false;
  return input.isOwnerOrGuardian;
}
