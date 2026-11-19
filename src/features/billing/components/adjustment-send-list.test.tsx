import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SendList } from "@/features/billing/adjustment-service";

const mocks = vi.hoisted(() => ({
  apply: vi.fn(),
  cancel: vi.fn(),
  mark: vi.fn(),
  publish: vi.fn(),
  refresh: vi.fn()
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh }) }));
vi.mock("@/app/actions/tuition-adjustment", () => ({
  applyTuitionAdjustmentAction: mocks.apply,
  cancelTuitionAdjustmentAction: mocks.cancel,
  markAdjustmentNotifiedAction: mocks.mark,
  publishAdjustmentNoticeAction: mocks.publish
}));

import { AdjustmentSendList } from "./adjustment-send-list";

function data(overrides: Partial<SendList["adjustment"]> = {}): SendList {
  return {
    adjustment: {
      id: "adj1",
      status: "draft",
      mode: "percent",
      effectiveFrom: "2027-01-01",
      totalMonthlyImpactCents: 3_000,
      itemCount: 3,
      createdAt: "2026-11-18T10:00:00.000Z",
      appliedAt: null,
      messageTemplate: "Olá, {nome}! A mensalidade de {nome_aluno} passa de {valor_atual} para {valor_novo} a partir de {vigencia}. {professor}",
      referenceIndexLabel: null,
      noticePublishedAt: null,
      ...overrides
    },
    rows: [
      { enrollmentId: "e1", studentName: "Pedro Souza", payerName: "Ana Souza", previousFeeCents: 10_000, newFeeCents: 11_000, discountCents: 0, whatsappBase: "https://wa.me/5511999998888", notifiedAt: "2026-11-19T10:00:00.000Z" },
      { enrollmentId: "e2", studentName: "Bia Costa", payerName: "Bia Costa", previousFeeCents: 20_000, newFeeCents: 22_000, discountCents: 0, whatsappBase: null, notifiedAt: null },
      { enrollmentId: "e3", studentName: "Caio Lima", payerName: "Caio Lima", previousFeeCents: 15_000, newFeeCents: 16_500, discountCents: 0, whatsappBase: "https://wa.me/5511988887777", notifiedAt: null }
    ]
  };
}

describe("AdjustmentSendList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra o progresso de avisados e atualiza ao marcar e desmarcar", async () => {
    const user = userEvent.setup();
    mocks.mark.mockResolvedValue({ ok: true, notifiedAt: "2026-11-19T10:00:00.000Z" });
    render(<AdjustmentSendList data={data()} professorName="Mestre João" />);
    expect(screen.getByTestId("progress-label")).toHaveTextContent("1 de 3 avisados");

    await user.click(screen.getByRole("checkbox", { name: "Avisado: Caio Lima" }));
    expect(screen.getByTestId("progress-label")).toHaveTextContent("2 de 3 avisados");
    expect(mocks.mark).toHaveBeenCalledWith("adj1", "e3", true);

    await user.click(screen.getByRole("checkbox", { name: "Avisado: Ana Souza" }));
    expect(screen.getByTestId("progress-label")).toHaveTextContent("1 de 3 avisados");
    expect(mocks.mark).toHaveBeenLastCalledWith("adj1", "e1", false);
  });

  it("desfaz a marcação quando o servidor recusa", async () => {
    const user = userEvent.setup();
    mocks.mark.mockResolvedValue({ ok: false, error: "Não foi possível concluir a operação." });
    render(<AdjustmentSendList data={data()} professorName="Mestre João" />);
    await user.click(screen.getByRole("checkbox", { name: "Avisado: Caio Lima" }));
    await waitFor(() => expect(screen.getByTestId("progress-label")).toHaveTextContent("1 de 3 avisados"));
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível concluir a operação.");
  });

  it("abre o WhatsApp com a mensagem codificada e esconde o botão sem telefone", () => {
    render(<AdjustmentSendList data={data()} professorName="Mestre João" />);
    const link = screen.getByRole("link", { name: "Abrir no WhatsApp: Ana Souza" });
    const url = new URL(link.getAttribute("href") as string);
    expect(url.origin + url.pathname).toBe("https://wa.me/5511999998888");
    const message = url.searchParams.get("text") as string;
    expect(message).toContain("Olá, Ana!");
    expect(message).toContain("A mensalidade de Pedro passa de");
    expect(message).toContain("01/01/2027");
    expect(message.endsWith("Mestre João")).toBe(true);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link.getAttribute("href")).not.toMatch(/\s/);

    expect(screen.queryByRole("link", { name: "Abrir no WhatsApp: Bia Costa" })).not.toBeInTheDocument();
    expect(screen.getByText("Sem telefone válido")).toBeInTheDocument();
  });

  it("copia a mensagem pronta de cada pagador", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<AdjustmentSendList data={data()} professorName="Mestre João" />);
    await user.click(screen.getByRole("button", { name: "Copiar mensagem para Caio Lima" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Olá, Caio!"));
    expect(await screen.findByRole("button", { name: "Copiar mensagem para Caio Lima" })).toHaveTextContent("Copiada");
  });

  it("confirma o reajuste por um diálogo de consequência e recarrega a tela", async () => {
    const user = userEvent.setup();
    mocks.apply.mockResolvedValue({ ok: true, applied: 3, skipped: 0, alreadyApplied: false });
    render(<AdjustmentSendList data={data()} professorName="Mestre João" />);
    await user.click(screen.getByRole("button", { name: "Confirmar reajuste" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/próxima renovação de cada contrato/)).toBeInTheDocument();
    expect(mocks.apply).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar reajuste" }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith("adj1"));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(await screen.findByText(/Reajuste confirmado para 3 alunos/)).toBeInTheDocument();
  });

  it("não oferece confirmar nem cancelar depois que o reajuste foi aplicado", () => {
    render(<AdjustmentSendList data={data({ status: "applied", appliedAt: "2026-11-20T10:00:00.000Z" })} professorName="Mestre João" />);
    expect(screen.queryByRole("button", { name: "Confirmar reajuste" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar campanha" })).not.toBeInTheDocument();
    expect(screen.getByText("Reajuste confirmado")).toBeInTheDocument();
  });

  it("desabilita o aviso geral quando já foi publicado", () => {
    render(<AdjustmentSendList data={data({ noticePublishedAt: "2026-11-20T10:00:00.000Z" })} professorName="Mestre João" />);
    expect(screen.getByRole("button", { name: "Aviso geral publicado" })).toBeDisabled();
  });
});
