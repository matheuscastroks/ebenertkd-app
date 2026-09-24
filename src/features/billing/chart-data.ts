import type { Charge, Payment } from "@/features/billing/types";

export type BillingTrendPoint = { competence: string; label: string; received: number; pending: number; overdue: number };

function previousCompetences(referenceDate: string, count: number) {
  const date = new Date(`${referenceDate.slice(0, 7)}-01T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - (count - 1 - index), 1));
    return `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function buildBillingTrend(charges: Charge[], payments: Payment[], referenceDate: string, count = 6): BillingTrendPoint[] {
  const competences = previousCompetences(referenceDate, count);
  const chargeById = new Map(charges.map((charge) => [charge.$id, charge]));
  return competences.map((competence) => {
    const monthCharges = charges.filter((charge) => charge.competence === competence);
    const received = payments.filter((payment) => payment.status === "confirmed" && payment.paid_at.slice(0, 7) === competence && chargeById.has(payment.charge_id)).reduce((sum, payment) => sum + payment.amount_cents, 0);
    const sum = (status: Charge["status"]) => monthCharges.filter((charge) => charge.status === status).reduce((total, charge) => total + charge.amount_cents, 0);
    const [year, month] = competence.split("-").map(Number);
    const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
    return { competence, label, received, pending: sum("pending") + sum("proof_under_review"), overdue: sum("overdue") };
  });
}
