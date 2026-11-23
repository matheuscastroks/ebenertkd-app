import type { Charge } from "@/features/billing/types";

export function effectiveChargeStatus(
  status: Charge["status"],
  dueDate: string,
  referenceDate: string
): Charge["status"] {
  return status === "pending" && dueDate.slice(0, 10) < referenceDate.slice(0, 10) ? "overdue" : status;
}
