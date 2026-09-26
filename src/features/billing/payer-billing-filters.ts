import type { Charge } from "@/features/billing/types";

export type PayerChargeView = "all" | "open" | "review" | "paid" | "cancelled";

export function filterPayerCharges(charges: Charge[], view: PayerChargeView, search: string, competence: string) {
  const term = search.trim().toLocaleLowerCase("pt-BR");
  return charges.filter((charge) => {
    const matchesView = view === "all"
      || (view === "open" && (charge.status === "pending" || charge.status === "overdue"))
      || (view === "review" && charge.status === "proof_under_review")
      || (view === "paid" && charge.status === "paid")
      || (view === "cancelled" && charge.status === "cancelled");
    return matchesView && (!competence || charge.competence === competence)
      && (!term || charge.description.toLocaleLowerCase("pt-BR").includes(term) || charge.competence.includes(term));
  });
}
