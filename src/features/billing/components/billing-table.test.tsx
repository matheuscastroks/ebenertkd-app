import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/billing/components/charge-actions", () => ({
  ChargeActions: () => <button>Gerenciar</button>,
}));

import { BillingTable } from "@/features/billing/components/billing-table";
import type { Charge } from "@/features/billing/types";

describe("BillingTable", () => {
  it("shows the payer, amount and semantic status in both responsive views", () => {
    const charge = {
      $id: "charge-1",
      student_id: "student-1",
      description: "Mensalidade 2026-09",
      competence: "2026-09",
      due_date: "2026-09-10",
      amount_cents: 15000,
      status: "overdue",
    } as Charge;
    render(
      <BillingTable
        charges={[charge]}
        names={new Map([["student-1", "Camila Ferreira"]])}
        photosByStudent={new Map([["student-1", "photo-1"]])}
        proofsByCharge={new Map()}
        payments={[]}
      />
    );
    expect(screen.getAllByText("Camila Ferreira")).toHaveLength(2);
    expect(screen.getAllByText("R$ 150,00")).toHaveLength(2);
    expect(screen.getAllByText("Inadimplente")).toHaveLength(2);
    expect(screen.getAllByLabelText("Foto de Camila Ferreira")).toHaveLength(2);
  });

  it("sorts rows when clicking the Valor column header", async () => {
    const user = userEvent.setup();
    const chargeA = {
      $id: "charge-1",
      student_id: "student-1",
      description: "Mensalidade A",
      competence: "2026-09",
      due_date: "2026-09-10",
      amount_cents: 20000, // R$ 200,00
      status: "pending",
    } as Charge;
    const chargeB = {
      $id: "charge-2",
      student_id: "student-2",
      description: "Mensalidade B",
      competence: "2026-09",
      due_date: "2026-09-10",
      amount_cents: 10000, // R$ 100,00
      status: "pending",
    } as Charge;

    render(
      <BillingTable
        charges={[chargeA, chargeB]}
        names={
          new Map([
            ["student-1", "Aluno Um"],
            ["student-2", "Aluno Dois"],
          ])
        }
        photosByStudent={new Map()}
        proofsByCharge={new Map()}
        payments={[]}
      />
    );

    const sortButton = screen.getByRole("button", { name: /Valor:/i });

    // Click 1: asc -> R$ 100,00 first
    await user.click(sortButton);
    const ascValues = screen
      .getAllByText(/R\$[\s\u00a0]100,00|R\$[\s\u00a0]200,00/)
      .map((el) => el.textContent);
    expect(ascValues[0]).toContain("100,00");

    // Click 2: desc -> R$ 200,00 first
    await user.click(sortButton);
    const descValues = screen
      .getAllByText(/R\$[\s\u00a0]100,00|R\$[\s\u00a0]200,00/)
      .map((el) => el.textContent);
    expect(descValues[0]).toContain("200,00");
  });
});
