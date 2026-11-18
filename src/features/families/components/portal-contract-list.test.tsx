import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { Contract } from "@/features/contracts/types";
import { PortalContractList } from "./portal-contract-list";

const contract = (id: string, status: Contract["status"], version: number) =>
  ({ $id: id, status, version_number: version, ends_at: "2027-01-31T00:00:00Z" }) as Contract;
const hrefFor = (id: string) => `/aluno/contratos/${id}`;

it("dá a ação principal só ao primeiro contrato aguardando assinatura", () => {
  render(<PortalContractList canSign hrefFor={hrefFor} emptyDescription="" contracts={[contract("a", "pending_signature", 2), contract("b", "signed", 1)]} />);
  expect(screen.getByRole("link", { name: "Assinar contrato versão 2" })).toHaveAttribute("data-variant", "default");
  expect(screen.getByRole("link", { name: "Ver contrato versão 1" })).toHaveAttribute("data-variant", "outline");
});
it("menor só lê o contrato, sem ação de assinar", () => {
  render(<PortalContractList canSign={false} hrefFor={hrefFor} emptyDescription="" contracts={[contract("a", "pending_signature", 1)]} />);
  expect(screen.queryByRole("link", { name: /Assinar/ })).toBeNull();
  expect(screen.getByRole("link", { name: "Ver contrato versão 1" })).toHaveAttribute("data-variant", "outline");
});
it("mostra estado vazio e erro de carregamento", () => {
  const { rerender } = render(<PortalContractList canSign hrefFor={hrefFor} emptyDescription="O contrato aparece após a confirmação." contracts={[]} />);
  expect(screen.getByText("Nenhum contrato emitido")).toBeInTheDocument();
  rerender(<PortalContractList canSign hrefFor={hrefFor} emptyDescription="" contracts={null} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os contratos");
});
