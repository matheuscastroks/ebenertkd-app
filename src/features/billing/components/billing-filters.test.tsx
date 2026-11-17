import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BillingFilters } from "./billing-filters";

const state = vi.hoisted(() => ({ query: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => "/admin/financeiro", useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/features/billing/components/pix-settings-dialog", () => ({ PixSettingsDialog: () => null }));

it("esconde limpar quando não há filtros ativos", () => {
  state.query = "";
  render(<BillingFilters classes={[]} />);
  expect(screen.queryByText("Limpar filtros")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Competência")).toHaveAttribute("placeholder", "AAAA-MM");
});

it("mostra filtros ativos e permite removê-los", () => {
  state.query = "status=proof_under_review";
  render(<BillingFilters classes={[]} />);
  expect(screen.getByRole("button", { name: "Remover filtro status" })).toHaveTextContent("Em análise");
  fireEvent.click(screen.getByText("Limpar filtros"));
  expect(state.replace).toHaveBeenCalledWith("/admin/financeiro", { scroll: false });
});
