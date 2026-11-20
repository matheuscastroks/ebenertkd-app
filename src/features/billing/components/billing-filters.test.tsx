import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BillingFilters } from "./billing-filters";

const state = vi.hoisted(() => ({ query: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }), usePathname: () => "/admin/financeiro", useSearchParams: () => new URLSearchParams(state.query) }));

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

it("mostra filtros ativos e limpa sem perder a situação escolhida nos chips", () => {
  state.query = "status=overdue&trainingClass=t1";
  render(<BillingFilters classes={[{ $id: "t1", name: "Adulto" } as never]} />);
  expect(screen.getByRole("button", { name: "Remover filtro turma" })).toHaveTextContent("Adulto");
  expect(screen.queryByLabelText("Situação")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Limpar filtros"));
  expect(state.replace).toHaveBeenCalledWith("/admin/financeiro?status=overdue", { scroll: false });
});
