import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Charge } from "@/features/billing/types";

vi.mock("@/app/actions/billing", () => ({ uploadPaymentProofAction: vi.fn() }));

import { chargeTitle, mostUrgentChargeId, PayerBillingView } from "./payer-billing-view";

const charge = (overrides: Partial<Charge>) => ({
  $id: "c1", charge_type: "monthly_fee", competence: "2026-10", description: "Mensalidade 2026-10",
  amount_cents: 15000, due_date: "2026-10-10", status: "pending", ...overrides
}) as Charge;

describe("financeiro do pagador", () => {
  it("mostra a competência legível no título da cobrança", () => {
    expect(chargeTitle(charge({}))).toBe("Mensalidade · out/2026");
    expect(chargeTitle(charge({ description: "", charge_type: "exam_fee" }))).toBe("Taxa de exame");
    expect(chargeTitle(charge({ description: "Exame de faixa — novembro", competence: "2026-11" }))).toBe("Exame de faixa — novembro");
  });

  it("escolhe a cobrança atrasada como a mais urgente", () => {
    const list = [charge({ $id: "a", due_date: "2026-09-10" }), charge({ $id: "b", status: "overdue", due_date: "2026-10-10" }), charge({ $id: "c", status: "paid" })];
    expect(mostUrgentChargeId(list)).toBe("b");
  });

  it("usa um único botão primário e rótulo neutro para pagar qualquer tipo de cobrança", () => {
    const charges = [
      charge({ $id: "m1", competence: "2026-10", description: "Mensalidade 2026-10", due_date: "2026-10-10" }),
      charge({ $id: "m2", competence: "2026-11", description: "Mensalidade 2026-11", due_date: "2026-11-10" }),
      charge({ $id: "e1", charge_type: "exam_fee", competence: "2026-11", description: "Taxa do exame de faixa", due_date: "2026-11-20" }),
    ];
    render(<PayerBillingView charges={charges} proofs={{}} settings={null} />);
    expect(screen.queryByRole("button", { name: /Pagar mensalidade/ })).not.toBeInTheDocument();
    const desktop = screen.getAllByRole("table")[0];
    const pay = within(desktop).getAllByRole("button", { name: /^Pagar:/ });
    expect(pay).toHaveLength(3);
    expect(pay.filter((button) => button.dataset.variant === "default")).toHaveLength(1);
    expect(within(desktop).getByRole("button", { name: "Pagar: Mensalidade · out/2026" })).toHaveAttribute("data-variant", "default");
    expect(within(desktop).getByText("Mensalidade · nov/2026")).toBeInTheDocument();
  });

  it("filtro de situação ativo não usa a cor da ação principal", () => {
    render(<PayerBillingView charges={[charge({})]} proofs={{}} settings={null} />);
    const active = screen.getByRole("button", { name: "Em aberto", pressed: true });
    expect(active).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("combobox", { name: "Filtrar por mês" })).toHaveTextContent("Todos os meses");
  });
});
