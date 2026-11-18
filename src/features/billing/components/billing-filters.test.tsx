import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BillingFilters } from "./billing-filters";

const state = vi.hoisted(() => ({ query: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => "/admin/financeiro", useSearchParams: () => new URLSearchParams(state.query) }));
vi.mock("@/features/billing/components/pix-settings-dialog", () => ({ PixSettingsDialog: () => null }));

it("esconde limpar quando não há filtros ativos e recolhe os filtros raros", () => {
  state.query = "";
  render(<BillingFilters classes={[]} />);
  expect(screen.queryByText("Limpar filtros")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Aluno")).toBeInTheDocument();
  expect(screen.queryByLabelText("Competência")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mais filtros" }));
  expect(screen.getByLabelText("Competência")).toHaveAttribute("placeholder", "AAAA-MM");
});

it("abre os filtros raros quando um deles está ativo e mostra a competência legível", () => {
  state.query = "competence=2026-10";
  render(<BillingFilters classes={[]} />);
  expect(screen.getByLabelText("Competência")).toHaveValue("2026-10");
  expect(screen.getByRole("button", { name: "Remover filtro competência" })).toHaveTextContent("out/2026");
});

it("mostra filtros ativos e permite removê-los", () => {
  state.query = "status=proof_under_review";
  render(<BillingFilters classes={[]} />);
  expect(screen.getByRole("button", { name: "Remover filtro situação" })).toHaveTextContent("Em análise");
  fireEvent.click(screen.getByText("Limpar filtros"));
  expect(state.replace).toHaveBeenCalledWith("/admin/financeiro", { scroll: false });
});

it("o campo Situação mostra o texto escolhido sem precisar abrir a lista", () => {
  state.query = "";
  const { unmount } = render(<BillingFilters classes={[]} />);
  expect(screen.getByLabelText("Situação")).toHaveTextContent("Todas");
  unmount();
  state.query = "status=overdue";
  render(<BillingFilters classes={[]} />);
  expect(screen.getByLabelText("Situação")).toHaveTextContent("Inadimplente");
});
