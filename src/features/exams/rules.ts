import type { Charge, ChargeStatus } from "@/features/billing/types";
import { graduationMatches, type BeltOption, type GubOption } from "@/features/students/options";
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

export function assertNextGraduation(currentGub: number | null | undefined, targetGub: GubOption, targetBelt: BeltOption) {
  if (!graduationMatches(targetGub, targetBelt)) throw new Error("exam_graduation_mismatch");
  if (currentGub == null || currentGub <= 0 || targetGub >= currentGub || targetGub < 0) {
    throw new Error("exam_graduation_must_be_next");
  }
}

export function examChargeCancellation(status: ChargeStatus, decision?: PaidChargeDecision) {
  if (["pending", "overdue", "cancelled"].includes(status)) return "cancel" as const;
  if (!decision) throw new Error("exam_paid_charge_decision_required");
  return "preserve" as const;
}

export function sortBeltHistoryNewestFirst(rows: BeltHistory[]) {
  return [...rows].sort((a, b) => b.achieved_at.localeCompare(a.achieved_at));
}
