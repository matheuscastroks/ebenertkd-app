import type { EnrollmentStatus } from "@/features/students/types";

/** Rótulos pt-BR do status da matrícula; nunca mostrar o valor cru do enum. */
export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  draft: "Rascunho",
  submitted: "Enviada",
  under_review: "Em análise",
  awaiting_signature: "Aguardando assinatura",
  active: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada",
  awaiting_renewal: "Aguardando renovação"
};
