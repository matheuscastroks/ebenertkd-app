import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CancellationsList } from "@/features/contracts/components/cancellations-list";
import ContractTemplatePage from "./modelo/page";
import { ContractLinks } from "@/features/contracts/components/contract-links";

const actions = vi.hoisted(() => ({ cancellation: vi.fn(), template: vi.fn() }));
vi.mock("@/app/actions/cancellations", () => ({ decideCancellationAction: actions.cancellation }));
vi.mock("@/app/actions/contracts", () => ({ saveContractTemplateAction: actions.template }));
vi.mock("@/features/contracts/cancellation-service", () => ({ listCancellationRequests: async () => [{ $id: "r1", contract_id: "c1", status: "pending", target_exit_month: "2026-12-01", notice_date: "2026-11-10", suggested_fee_cents: 15000 }] }));
vi.mock("@/features/contracts/contract-service", () => ({ getContract: async () => ({ student_name: "Ana Souza" }) }));
vi.mock("@/features/contracts/template-service", () => ({ DEFAULT_CONTRACT_CONTENT: "Contrato padrão", getContractTemplate: async () => ({ $id: "t1", name: "Modelo padrão", draft_content: "Texto do contrato" }), listContractVersions: async () => [{ $id: "v1", version: 1, published_at: "2026-11-10" }] }));
vi.mock("@/lib/auth/session", () => ({ requireProfile: async () => ({ $id: "admin" }) }));
vi.mock("@/components/dashboard/portal-shell", () => ({ PortalShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/shared/operation-toast", () => ({ OperationToast: () => null }));

it("rescisão exige justificativa e confirma taxa e consequência antes de enviar", async () => {
  render(await CancellationsList());
  fireEvent.click(screen.getByRole("button", { name: "Rejeitar pedido" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Condições acordadas com responsável" } });
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "75.00" } });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar rescisão" }));
  expect(screen.getByText(/contrato será encerrado.*aluno será notificado/)).toBeVisible();
  expect(screen.getByText(/75,00/)).toBeVisible();
  expect(actions.cancellation).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "Aprovar rescisão" }).at(-1)!);
  await waitFor(() => expect(actions.cancellation).toHaveBeenCalledTimes(1));
  expect(actions.cancellation.mock.calls[0][0].get("decision")).toBe("approved");
  expect(actions.cancellation.mock.calls[0][0].get("fee_reais")).toBe("75.00");
});

it("publicar versão informa efeito sobre contratos e mantém rascunho sem publicar", async () => {
  render(await ContractTemplatePage({ searchParams: Promise.resolve({}) }));
  fireEvent.click(screen.getByRole("button", { name: "Publicar nova versão" }));
  expect(screen.getByRole("heading", { name: "Publicar versão 2?" })).toBeVisible();
  expect(screen.getByText("Novos contratos usarão esta versão. Contratos atuais não mudam.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(actions.template).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Conteúdo e cláusulas"), { target: { value: "Novo texto" } });
  expect(screen.getByText("10 caracteres")).toBeVisible();
});

it("hub mostra pendências e navegação com lista simples sem caixas de ícones", async () => {
  const { container } = render(await ContractLinks());
  expect(screen.getByRole("link", { name: /Modelo de contrato/ })).toHaveAttribute("href", "/admin/contratos/modelo");
  expect(screen.getByText("1 pedido aguardando análise")).toBeVisible();
  expect(container.querySelector("svg")).not.toBeInTheDocument();
});
