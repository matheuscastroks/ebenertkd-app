import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import { DependentHeader } from "./dependent-header";
const siblings = [{ profileId: "ana", name: "Ana" }, { profileId: "bia", name: "Bia" }];
it("identifica o filho e troca mantendo a seção", async () => {
  render(<DependentHeader name="Ana" belt="Branca" currentProfileId="ana" siblings={siblings} section="financeiro" />);
  expect(screen.getByRole("heading", { name: "Financeiro · Ana" })).toBeInTheDocument();
  expect(screen.getByText(/Branca/)).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Trocar dependente"), "bia");
  expect(push).toHaveBeenCalledWith("/responsavel/dependentes/bia/financeiro");
});
it("não mostra seletor com apenas um filho", () => {
  render(<DependentHeader name="Ana" currentProfileId="ana" siblings={siblings.slice(0, 1)} section="exames" />);
  expect(screen.queryByLabelText("Trocar dependente")).not.toBeInTheDocument();
});
