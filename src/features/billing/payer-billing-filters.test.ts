import { describe, expect, it } from "vitest";
import { filterPayerCharges } from "@/features/billing/payer-billing-filters";
import type { Charge } from "@/features/billing/types";

const charges = [
  { $id: "a", description: "Mensalidade setembro", competence: "2026-09", status: "pending" },
  { $id: "b", description: "Exame de faixa", competence: "2026-08", status: "paid" },
  { $id: "c", description: "Mensalidade julho", competence: "2026-07", status: "overdue" }
] as Charge[];

describe("filterPayerCharges", () => {
  it("separa pagamentos em aberto dos quitados", () => {
    expect(filterPayerCharges(charges, "open", "", "").map((charge) => charge.$id)).toEqual(["a", "c"]);
    expect(filterPayerCharges(charges, "paid", "", "").map((charge) => charge.$id)).toEqual(["b"]);
  });

  it("combina busca e competência sem alterar as cobranças originais", () => {
    expect(filterPayerCharges(charges, "all", "mensalidade", "2026-07").map((charge) => charge.$id)).toEqual(["c"]);
    expect(charges).toHaveLength(3);
  });
});
