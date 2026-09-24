import { createHash } from "node:crypto";
import type { Charge, Payment } from "@/features/billing/types";

export function resolveDueDate(competence: string, dueDay: number) {
  const [year, month] = competence.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${competence}-${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
}

export function competenceFromDate(date: string) { return date.slice(0, 7); }
export function chargeRowId(enrollmentId: string, type: string, competence: string, originId: string) { return createHash("sha256").update(`${enrollmentId}:${type}:${competence}:${originId}`).digest("hex").slice(0, 36); }
export function isCompetenceWithinContract(competence: string, startsAt: string, endsAt: string) {
  const first = `${competence}-01`;
  const [year, month] = competence.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return last >= startsAt.slice(0, 10) && first <= endsAt.slice(0, 10);
}
export function shouldGenerateCompetence(competence: string, referenceDate: string) {
  const start = Date.parse(`${competence}-01T00:00:00Z`);
  const reference = Date.parse(`${referenceDate.slice(0, 10)}T00:00:00Z`);
  return reference >= start - 7 * 86400000;
}
export function effectiveChargeStatus(status: Charge["status"], dueDate: string, referenceDate: string): Charge["status"] {
  return status === "pending" && dueDate.slice(0, 10) < referenceDate.slice(0, 10) ? "overdue" : status;
}
export function billingSummary(charges: Charge[], payments: Payment[], startDate: string, endDate: string) {
  const chargeIds = new Set(charges.map((charge) => charge.$id));
  const confirmed = payments.filter((payment) => chargeIds.has(payment.charge_id) && payment.status === "confirmed" && payment.paid_at.slice(0, 10) >= startDate && payment.paid_at.slice(0, 10) <= endDate);
  const paidChargeIds = new Set(confirmed.map((payment) => payment.charge_id));
  const studentIds = new Set(charges.filter((charge) => paidChargeIds.has(charge.$id)).map((charge) => charge.student_id));
  const sum = (statuses: Charge["status"][]) => charges.filter((charge) => statuses.includes(charge.status)).reduce((total, charge) => total + charge.amount_cents, 0);
  return { receivedCents: confirmed.reduce((total, payment) => total + payment.amount_cents, 0), pendingCents: sum(["pending"]), overdueCents: sum(["overdue"]), underReviewCents: sum(["proof_under_review"]), paidCharges: confirmed.length, distinctPayingStudents: studentIds.size };
}
export function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
