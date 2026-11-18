import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { DependentHeader, DependentSwitcher } from "./dependent-header";
const siblings = [{ profileId: "ana", name: "Ana" }, { profileId: "bia", name: "Bia" }];
it("identifica o filho e troca mantendo a seção", async () => {
  render(<DependentHeader name="Ana" belt="Branca" currentProfileId="ana" siblings={siblings} section="financeiro" />);
  expect(screen.getByRole("region", { name: "Financeiro de Ana" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/responsavel/dependentes/ana");
  expect(screen.getByText(/Branca/)).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Trocar dependente"), "bia");
  expect(push).toHaveBeenCalledWith("/responsavel/dependentes/bia/financeiro");
});
it("no resumo, troca de filho continua no resumo", async () => {
  render(<DependentSwitcher currentProfileId="ana" siblings={siblings} section="resumo" />);
  await userEvent.selectOptions(screen.getByLabelText("Trocar dependente"), "bia");
  expect(push).toHaveBeenCalledWith("/responsavel/dependentes/bia");
});
it("não mostra seletor com apenas um filho", () => {
  render(<DependentHeader name="Ana" currentProfileId="ana" siblings={siblings.slice(0, 1)} section="exames" />);
  expect(screen.queryByLabelText("Trocar dependente")).not.toBeInTheDocument();
});
