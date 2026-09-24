import type { ChargeStatus } from "@/features/billing/types";
import { beltForGub, type BeltOption, type GubOption } from "@/features/students/options";
import type { BeltHistory } from "@/features/exams/types";

export type PaidChargeDecision = "future_credit" | "keep_charge";

export function assertNextGraduation(currentGub: number | null | undefined, targetGub: GubOption, targetBelt: BeltOption) {
  if (beltForGub(targetGub) !== targetBelt) throw new Error("exam_graduation_mismatch");
  if (currentGub == null || targetGub !== currentGub - 1) throw new Error("exam_graduation_must_be_next");
}

export function examChargeCancellation(status: ChargeStatus, decision?: PaidChargeDecision) {
  if (["pending", "overdue", "cancelled"].includes(status)) return "cancel" as const;
  if (!decision) throw new Error("exam_paid_charge_decision_required");
  return "preserve" as const;
}

export function sortBeltHistoryNewestFirst(rows: BeltHistory[]) {
  return [...rows].sort((a, b) => b.achieved_at.localeCompare(a.achieved_at));
}
