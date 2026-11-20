import type { Charge, ChargeStatus } from "@/features/billing/types";
import { examTargetRanks, findRank, type PublicRank } from "@/features/academy/belt-rules";
import { isRankKey, rankOrder, type RankKey } from "@/features/academy/ranks";
import type { BeltHistory, ExamEvent, ExamParticipant } from "@/features/exams/types";

export type StudentExamEntry = { participant: ExamParticipant; event: ExamEvent; charge?: Charge | null };

export function groupStudentExams(entries: StudentExamEntry[]) {
  const visible = entries.filter((entry) => entry.participant.status !== "cancelled");
  const isUpcoming = (entry: StudentExamEntry) =>
    entry.participant.status === "registered" && (entry.event.status === "planned" || entry.event.status === "confirmed");
  return {
    upcoming: visible.filter(isUpcoming).sort((a, b) => a.event.event_date.localeCompare(b.event.event_date)),
    past: visible.filter((entry) => !isUpcoming(entry)).sort((a, b) => b.event.event_date.localeCompare(a.event.event_date))
  };
}

export type PaidChargeDecision = "future_credit" | "keep_charge";

/** Na inscrição: o alvo precisa ser uma graduação habilitada acima da atual (e só a próxima, se a política não permite pular). */
export function assertNextGraduation(ranks: readonly PublicRank[], currentRankKey: string | null | undefined, targetRankKey: string, allowSkip: boolean) {
  if (!findRank(ranks, targetRankKey)) throw new Error("exam_graduation_mismatch");
  if (!examTargetRanks(ranks, currentRankKey, allowSkip).some((rank) => rank.rank_key === targetRankKey)) {
    throw new Error("exam_graduation_must_be_next");
  }
}

/** No resultado: o alvo já foi aceito na inscrição; só garante que ainda é uma promoção (mesmo se a graduação foi desativada depois). */
export function assertPromotion(currentRankKey: string | null | undefined, targetRankKey: RankKey) {
  if (!isRankKey(currentRankKey) || rankOrder(targetRankKey) <= rankOrder(currentRankKey)) {
    throw new Error("exam_graduation_must_be_next");
  }
}

/** Taxa do exame: a da graduação alvo tem prioridade; senão a taxa padrão da banca. */
export function examFeeCents(rankFeeCents: number | null | undefined, eventDefaultFeeCents: number): number {
  return rankFeeCents ?? eventDefaultFeeCents;
}

export function examChargeCancellation(status: ChargeStatus, decision?: PaidChargeDecision) {
  if (["pending", "overdue", "cancelled"].includes(status)) return "cancel" as const;
  if (!decision) throw new Error("exam_paid_charge_decision_required");
  return "preserve" as const;
}

export function sortBeltHistoryNewestFirst(rows: BeltHistory[]) {
  return [...rows].sort((a, b) => b.achieved_at.localeCompare(a.achieved_at));
}
