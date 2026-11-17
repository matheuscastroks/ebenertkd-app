import type { StatusTone } from "@/components/shared/status-badge";
import type { ChargeStatus } from "@/features/billing/types";
import type { ExamEvent, ExamParticipant } from "@/features/exams/types";

export const examEventLabels: Record<ExamEvent["status"], string> = {
  planned: "Planejado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado"
};

export const examEventTones: Record<ExamEvent["status"], StatusTone> = {
  planned: "neutral",
  confirmed: "info",
  completed: "success",
  cancelled: "danger"
};

export const examParticipantLabels: Record<ExamParticipant["status"], string> = {
  registered: "Inscrito",
  approved: "Aprovado",
  failed: "Reprovado",
  absent: "Ausente",
  cancelled: "Cancelado"
};

export const examParticipantTones: Record<ExamParticipant["status"], StatusTone> = {
  registered: "info",
  approved: "success",
  failed: "danger",
  absent: "warning",
  cancelled: "neutral"
};

export const examFeeLabels: Record<ChargeStatus, string> = {
  pending: "Taxa pendente",
  proof_under_review: "Comprovante em análise",
  paid: "Taxa paga",
  overdue: "Taxa em atraso",
  cancelled: "Taxa cancelada"
};

export const examFeeTones: Record<ChargeStatus, StatusTone> = {
  pending: "warning",
  proof_under_review: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral"
};

/** Datas de exame são gravadas ao meio-dia UTC; formatar em UTC evita mudar o dia. */
export function formatExamDate(isoDate: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" }) {
  return new Date(isoDate).toLocaleDateString("pt-BR", { ...options, timeZone: "UTC" });
}
