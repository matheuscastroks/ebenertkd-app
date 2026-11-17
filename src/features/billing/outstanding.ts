import type { Charge } from "./types";

export function getOutstandingCharge(charges: Charge[]): Charge | undefined {
  return charges.filter((charge) => ["pending", "overdue", "proof_under_review"].includes(charge.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
}

export function outstandingLabel(charge: Charge) {
  if (charge.status === "proof_under_review") return "Comprovante em análise";
  return charge.status === "overdue" ? "Em atraso" : "Pendente";
}
