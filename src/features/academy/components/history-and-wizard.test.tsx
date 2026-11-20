import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_ACADEMY_IDENTITY, DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";
import type { HistoryEntry } from "@/features/academy/history-rules";

const actions = vi.hoisted(() => ({ identity: vi.fn(), billing: vi.fn(), contract: vi.fn(), complete: vi.fn(), restore: vi.fn(), defaultFee: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/app/actions/academy-settings", () => ({
  saveAcademyIdentityAction: actions.identity,
  saveBillingPolicyAction: actions.billing,
  saveContractPolicyAction: actions.contract,
  completeSetupAction: actions.complete,
  restoreConfigRevisionAction: actions.restore,
  saveDefaultMonthlyFeeAction: actions.defaultFee,
  applyBeltPresetAction: vi.fn()
}));
vi.mock("@/app/actions/billing", () => ({ saveBillingSettingsAction: vi.fn() }));
vi.mock("@/app/actions/tuition-adjustment", () => ({
  applyTuitionAdjustmentAction: vi.fn(),
  cancelTuitionAdjustmentAction: vi.fn(),
  markAdjustmentNotifiedAction: vi.fn(),
  publishAdjustmentNoticeAction: vi.fn()
}));

import { HistoryDiff } from "@/features/academy/components/history-diff";
import { HistoryTimeline } from "@/features/academy/components/history-timeline";
import { SetupWizard, type SetupWizardProps } from "@/features/academy/components/setup-wizard";
import { suggestedDefaultFeeCents } from "@/features/billing/components/adjustment-send-list";
import { DefaultFeeShortcut } from "@/features/billing/components/default-fee-shortcut";

const wrap = (node: React.ReactNode) => render(<TooltipProvider>{node}</TooltipProvider>);
const sent = (mock: ReturnType<typeof vi.fn>) => Object.fromEntries((mock.mock.calls[0][0] as FormData).entries());

beforeEach(() => {
  for (const mock of [...Object.values(actions), refresh, toast.success, toast.error]) mock.mockReset();
});

const entry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "rev-1",
  scope: "policy",
  section: "billing",
  sectionLabel: "Financeiro",
  revision: 1,
  changedAt: "2026-11-18T15:00:00.000Z",
  reason: null,
  diff: [{ field: "default_monthly_fee_cents", label: "Mensalidade padrão", before: "R$ 150,00", after: "R$ 180,00" }],
  isCurrent: false,
  latestRevision: 2,
  ...overrides
});

describe("renderização da diferença", () => {
  it("mostra rótulo, antes e depois de cada campo", () => {
    render(<HistoryDiff rows={entry().diff} />);
    expect(screen.getByText("Mensalidade padrão")).toBeVisible();
    expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 180,00")).toBeInTheDocument();
  });

  it("avisa quando nenhum campo mudou", () => {
    render(<HistoryDiff rows={[]} />);
    expect(screen.getByText("Nenhum campo mudou nesta revisão.")).toBeVisible();
  });
});

describe("linha do tempo", () => {
  it("restaurar pede confirmação e envia a revisão mais recente da seção", async () => {
    actions.restore.mockResolvedValue({ ok: true });
    wrap(<HistoryTimeline entries={[entry()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar esta versão" }));
    expect(await screen.findByText(/nova revisão/)).toBeVisible();
    expect(actions.restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(actions.restore).toHaveBeenCalledWith("rev-1", 2));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Versão restaurada", expect.anything()));
    expect(refresh).toHaveBeenCalled();
  });

  it("a versão em vigor não pode ser restaurada e conflito avisa para recarregar", async () => {
    const { unmount } = wrap(<HistoryTimeline entries={[entry({ isCurrent: true, revision: 2 })]} />);
    expect(screen.getByRole("button", { name: "Restaurar esta versão" })).toBeDisabled();
    unmount();
    actions.restore.mockResolvedValue({ ok: false, error: "revision_conflict" });
    wrap(<HistoryTimeline entries={[entry()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar esta versão" }));
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível restaurar", expect.objectContaining({ description: expect.stringContaining("Recarregue") })));
  });
});

const wizardProps = (overrides: Partial<SetupWizardProps> = {}): SetupWizardProps => ({
  identity: DEFAULT_ACADEMY_IDENTITY,
  identityRevision: 0,
  identityConfigured: false,
  ranks: [],
  presets: [],
  gradesCustomized: false,
  billing: { policy: DEFAULT_BILLING_POLICY, revision: 0, customized: false },
  pix: null,
  contract: { policy: DEFAULT_CONTRACT_POLICY, revision: 0, customized: false, templateUsesVariables: null },
  setupCompleted: false,
  ...overrides
});

describe("assistente de primeiros passos", () => {
  it("passo de mensalidade salva a política sem tocar nos outros passos nem concluir", async () => {
    actions.billing.mockResolvedValue({ ok: true, revision: 1 });
    wrap(<SetupWizard {...wizardProps({ initialStep: 2 })} />);
    fireEvent.change(screen.getByLabelText("Mensalidade padrão"), { target: { value: "170,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar política financeira" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.billing).toHaveBeenCalledTimes(1));
    expect(sent(actions.billing)).toMatchObject({ default_monthly_fee: "170,00" });
    expect(actions.identity).not.toHaveBeenCalled();
    expect(actions.contract).not.toHaveBeenCalled();
    expect(actions.complete).not.toHaveBeenCalled();
  });

  it("passo do contrato salva só as regras de contrato", async () => {
    actions.contract.mockResolvedValue({ ok: true, revision: 1 });
    wrap(<SetupWizard {...wizardProps({ initialStep: 3 })} />);
    fireEvent.change(screen.getByLabelText("Dia limite do aviso"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar regras de contrato" }));
    fireEvent.click(await screen.findByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.contract).toHaveBeenCalledTimes(1));
    expect(sent(actions.contract)).toMatchObject({ cancellation_notice_day: "15", renewal_reminder_days: "30, 7" });
    expect(actions.billing).not.toHaveBeenCalled();
  });

  it("revisão oferece padrão sugerido para o que não foi preenchido e só conclui ao pedir", async () => {
    actions.billing.mockResolvedValue({ ok: true, revision: 1 });
    actions.complete.mockResolvedValue({ ok: true });
    wrap(<SetupWizard {...wizardProps({ initialStep: 4 })} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Usar padrão sugerido" })[0]);
    await waitFor(() => expect(actions.billing).toHaveBeenCalledTimes(1));
    expect(sent(actions.billing)).toMatchObject({ default_monthly_fee: "150,00", charge_lead_days: "7", revision: "0" });
    expect(actions.complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Concluir configuração" }));
    await waitFor(() => expect(actions.complete).toHaveBeenCalledTimes(1));
  });

  it("navega entre os passos", () => {
    wrap(<SetupWizard {...wizardProps()} />);
    expect(screen.getByRole("button", { name: /Sua academia/ })).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Próximo passo" }));
    expect(screen.getByRole("button", { name: /Graduações/ })).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: /Sua academia/ })).toHaveAttribute("aria-current", "step");
  });
});

describe("integração com as ferramentas financeiras", () => {
  it("calculadora: só oferece o atalho quando o valor difere e confirma antes de gravar", async () => {
    actions.defaultFee.mockResolvedValue({ ok: true, revision: 4 });
    const { rerender } = render(<DefaultFeeShortcut initial={{ cents: 15000, revision: 3 }} candidateCents={15000} />);
    expect(screen.getByTestId("default-fee")).toHaveTextContent("150,00");
    expect(screen.queryByRole("button", { name: "Usar como mensalidade padrão" })).not.toBeInTheDocument();
    rerender(<DefaultFeeShortcut initial={{ cents: 15000, revision: 3 }} candidateCents={18000} />);
    fireEvent.click(screen.getByRole("button", { name: "Usar como mensalidade padrão" }));
    expect(await screen.findByText(/Os alunos atuais não mudam/)).toBeVisible();
    expect(actions.defaultFee).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Usar como padrão" }));
    await waitFor(() => expect(actions.defaultFee).toHaveBeenCalledWith(18000, 3));
  });

  it("reajuste propõe o valor novo mais comum como mensalidade padrão", () => {
    expect(suggestedDefaultFeeCents([{ newFeeCents: 16000 }, { newFeeCents: 17000 }, { newFeeCents: 16000 }])).toBe(16000);
    expect(suggestedDefaultFeeCents([])).toBeNull();
  });
});
