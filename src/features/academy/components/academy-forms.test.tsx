import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_ACCESS_POLICY, DEFAULT_ACADEMY_IDENTITY, DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";

const actions = vi.hoisted(() => ({
  identity: vi.fn(),
  billing: vi.fn(),
  access: vi.fn(),
  contract: vi.fn(),
  impact: vi.fn()
}));
const refresh = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/app/actions/academy-settings", () => ({
  saveAcademyIdentityAction: actions.identity,
  saveBillingPolicyAction: actions.billing,
  saveAccessPolicyAction: actions.access,
  saveContractPolicyAction: actions.contract,
  previewAccessImpactAction: actions.impact
}));

import { AccessPolicyForm } from "@/features/academy/components/access-policy-form";
import { BillingPolicyForm } from "@/features/academy/components/billing-policy-form";
import { ContractPolicyForm } from "@/features/academy/components/contract-policy-form";
import { IdentityForm } from "@/features/academy/components/identity-form";

const wrap = (node: React.ReactNode) => render(<TooltipProvider>{node}</TooltipProvider>);
const sent = (mock: ReturnType<typeof vi.fn>) => Object.fromEntries((mock.mock.calls[0][0] as FormData).entries());

beforeEach(() => {
  for (const mock of [...Object.values(actions), refresh, toast.success, toast.error]) mock.mockReset();
});

describe("formulário financeiro", () => {
  it("mostra os padrões atuais e só pede o valor da taxa quando ligada", () => {
    wrap(<BillingPolicyForm policy={DEFAULT_BILLING_POLICY} revision={0} />);
    expect(screen.getByLabelText("Mensalidade padrão")).toHaveValue("150,00");
    expect(screen.queryByLabelText("Valor da taxa de matrícula")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Cobrar taxa de matrícula" }));
    expect(screen.getByLabelText("Valor da taxa de matrícula")).toBeInTheDocument();
  });

  it("confirma com o aviso de impacto e envia os valores em reais com a revisão", async () => {
    actions.billing.mockResolvedValue({ ok: true, revision: 1 });
    wrap(<BillingPolicyForm policy={DEFAULT_BILLING_POLICY} revision={0} />);
    fireEvent.change(screen.getByLabelText("Mensalidade padrão"), { target: { value: "180,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar política financeira" }));
    expect(await screen.findByText(/apenas para novas matrículas/)).toBeVisible();
    expect(actions.billing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.billing).toHaveBeenCalledTimes(1));
    expect(sent(actions.billing)).toMatchObject({ default_monthly_fee: "180,00", revision: "0", adjustment_min_notice_days: "30" });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Política financeira atualizada"));
    expect(refresh).toHaveBeenCalled();
  });

  it("conflito de revisão avisa para recarregar", async () => {
    actions.billing.mockResolvedValue({ ok: false, error: "revision_conflict" });
    wrap(<BillingPolicyForm policy={DEFAULT_BILLING_POLICY} revision={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar política financeira" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível salvar", expect.objectContaining({ description: expect.stringContaining("Recarregue") })));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("formulário de acesso ao aplicativo", () => {
  it("calcula e mostra quantos alunos ficariam bloqueados", async () => {
    actions.impact.mockResolvedValue({ ok: true, impact: { total: 12, lockedNow: 1, lockedProposed: 3 } });
    wrap(<AccessPolicyForm policy={DEFAULT_ACCESS_POLICY} revision={0} />);
    fireEvent.change(screen.getByLabelText("Dias de acesso após o pagamento"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver quantos alunos seriam bloqueados hoje" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Hoje, 1 de 12 alunos ativos está bloqueado. Com estes valores, 3 ficariam bloqueados.");
    expect(sent(actions.impact)).toMatchObject({ window_days: "20" });
  });

  it("desligar o bloqueio esconde a janela e avisa no resumo", async () => {
    wrap(<AccessPolicyForm policy={DEFAULT_ACCESS_POLICY} revision={0} />);
    fireEvent.click(screen.getByRole("switch", { name: "Bloquear o acesso por mensalidade" }));
    expect(screen.queryByLabelText("Dias de acesso após o pagamento")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar regra de acesso" }));
    expect(await screen.findByText(/ninguém ficará bloqueado/)).toBeVisible();
  });
});

describe("formulário de contrato", () => {
  it("avisa que contratos assinados mantêm a regra e pede nova versão do modelo", async () => {
    actions.contract.mockResolvedValue({ ok: true, revision: 1 });
    wrap(<ContractPolicyForm policy={DEFAULT_CONTRACT_POLICY} revision={0} templateUsesVariables={false} />);
    fireEvent.change(screen.getByLabelText("Dia limite do aviso"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar regras de contrato" }));
    expect(await screen.findByText(/Contratos já assinados mantêm a regra de cancelamento/)).toBeVisible();
    expect(screen.getByText(/publique uma nova versão do modelo/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.contract).toHaveBeenCalled());
    expect(sent(actions.contract)).toMatchObject({ cancellation_notice_day: "10", exit_fee_mode: "one_monthly_fee" });
  });

  it("encargo fixo pede o valor", () => {
    wrap(<ContractPolicyForm policy={{ ...DEFAULT_CONTRACT_POLICY, exit_fee_mode: "fixed", exit_fee_cents: 5000 }} revision={1} templateUsesVariables />);
    expect(screen.getByLabelText("Valor fixo do encargo")).toHaveValue("50,00");
  });
});

describe("formulário de identidade", () => {
  it("mostra a identidade atual, confirma e envia", async () => {
    actions.identity.mockResolvedValue({ ok: true, revision: 1 });
    wrap(<IdentityForm identity={DEFAULT_ACADEMY_IDENTITY} revision={0} />);
    expect(screen.getByLabelText("Nome curto")).toHaveValue("Ebener TKD");
    fireEvent.change(screen.getByLabelText("Nome curto"), { target: { value: "Dragão TKD" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));
    expect(await screen.findByText(/pode exigir reinstalação/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.identity).toHaveBeenCalled());
    expect(sent(actions.identity)).toMatchObject({ short_name: "Dragão TKD", legal_name: "Ebener Taekwondo", revision: "0" });
  });

  it("mostra a mensagem de validação do servidor no campo", async () => {
    actions.identity.mockResolvedValue({ ok: false, error: "invalid", fields: { document_number: "CNPJ inválido" } });
    wrap(<IdentityForm identity={DEFAULT_ACADEMY_IDENTITY} revision={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("CNPJ inválido")).toBeInTheDocument();
  });
});
