import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ChargeActions } from "./charge-actions";
import type { Charge, Payment } from "../types";

vi.mock("@/app/actions/billing", () => ({ adjustChargeAction: vi.fn(), decidePaymentProofAction: vi.fn(), recordManualPaymentAction: vi.fn(), reversePaymentAction: vi.fn() }));

it("estorno explica que o estado em aberto depende do vencimento", () => {
  render(<ChargeActions studentName="Ana Souza" charge={{ $id: "c1", status: "paid", amount_cents: 15000, competence: "2026-11", due_date: "2026-11-01" } as Charge} payment={{ $id: "p1", amount_cents: 15000, paid_at: "2026-11-02" } as Payment} />);
  fireEvent.click(screen.getByRole("button", { name: "Estornar" }));
  expect(screen.getByText(/Pendente ou Em atraso, conforme o vencimento/)).toBeVisible();
  expect(screen.getByText(/150,00/)).toBeVisible();
  expect(screen.getByLabelText("Motivo do estorno")).toBeRequired();
});

it("revisa o valor da instância aberta quando há duas visualizações responsivas", () => {
  const charge = { $id: "c1", status: "pending", amount_cents: 15000, competence: "2026-11", due_date: "2026-11-01", description: "Mensalidade" } as Charge;
  render(<><ChargeActions studentName="Ana Souza" charge={charge} /><ChargeActions studentName="Ana Souza" charge={charge} /></>);
  fireEvent.click(screen.getAllByRole("button", { name: "Gerenciar" })[1]);
  fireEvent.change(screen.getByLabelText("Valor recebido (R$)"), { target: { value: "190.00" } });
  fireEvent.change(screen.getByLabelText("Observação interna"), { target: { value: "Recebimento conferido no extrato" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento manual" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  expect(screen.getByText(/190,00/)).toBeVisible();
});
