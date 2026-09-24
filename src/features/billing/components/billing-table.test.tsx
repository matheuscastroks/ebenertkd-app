import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/billing/components/charge-actions", () => ({ ChargeActions: () => <button>Gerenciar</button> }));

import { BillingTable } from "@/features/billing/components/billing-table";
import type { Charge } from "@/features/billing/types";

describe("BillingTable", () => {
  it("shows the payer, amount and semantic status in both responsive views", () => {
    const charge = { $id: "charge-1", student_id: "student-1", description: "Mensalidade 2026-09", competence: "2026-09", due_date: "2026-09-10", amount_cents: 15000, status: "overdue" } as Charge;
    render(<BillingTable charges={[charge]} names={new Map([["student-1", "Camila Ferreira"]])} proofsByCharge={new Map()} payments={[]} />);
    expect(screen.getAllByText("Camila Ferreira")).toHaveLength(2);
    expect(screen.getAllByText("R$ 150,00")).toHaveLength(2);
    expect(screen.getAllByText("Inadimplente")).toHaveLength(2);
  });
});
