import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdjustmentCandidate } from "@/features/billing/adjustment-service";
import type { SavedScenario } from "@/features/billing/planning-service";

const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: vi.fn() }) }));
vi.mock("@/app/actions/tuition-adjustment", () => ({ saveTuitionAdjustmentAction: mocks.save }));

import { AdjustmentWizard } from "./adjustment-wizard";

const candidates: AdjustmentCandidate[] = [
  { enrollmentId: "e1", studentId: "s1", studentName: "Ana Lima", classId: "c1", className: "Turma A", currentFeeCents: 10_000, discountCents: 0, contractEnd: "2026-12-10" },
  { enrollmentId: "e2", studentId: "s2", studentName: "Bia Costa", classId: "c1", className: "Turma A", currentFeeCents: 20_000, discountCents: 2_000, contractEnd: "2027-03-31" },
  { enrollmentId: "e3", studentId: "s3", studentName: "Caio Souza", classId: "c2", className: "Turma B", currentFeeCents: 15_000, discountCents: 0, contractEnd: null }
];

const scenario: SavedScenario = {
  id: "sc1",
  name: "Atual",
  fixedCosts: [{ label: "Aluguel", amountCents: 40_000 }],
  variableCostCents: 0,
  paymentFeePercent: 0,
  proLaboreCents: 20_000,
  reserveCents: 0,
  defaultRatePercent: 0,
  updatedAt: "2026-11-18T10:00:00.000Z"
};

const testId = (id: string) => screen.getByTestId(id).textContent?.replace(/\s/g, " ") ?? "";

function renderWizard(props: Partial<Parameters<typeof AdjustmentWizard>[0]> = {}) {
  return render(<AdjustmentWizard candidates={candidates} scenarios={[scenario]} today="2026-11-18" professorName="Mestre João" {...props} />);
}

async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("AdjustmentWizard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("abre com vigência de pelo menos 30 dias e sem aviso de antecedência", () => {
    renderWizard();
    expect(screen.getByText(/Aviso com \d+ dias de antecedência/)).toBeInTheDocument();
    expect(screen.queryByTestId("notice-warning")).not.toBeInTheDocument();
  });

  it("avisa, sem bloquear, quando a antecedência é menor que 30 dias", async () => {
    const user = userEvent.setup();
    renderWizard({ initialEffectiveFrom: "2026-12-01" });
    expect(screen.getByTestId("notice-warning")).toHaveTextContent(/menos do que os 30 dias/);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    await next(user);
    expect(screen.getByText("Quem é afetado", { selector: "[data-slot=card-title]" })).toBeInTheDocument();
  });

  it("calcula novos valores, mantém o desconto, permite excluir alunos e atualiza o impacto", async () => {
    const user = userEvent.setup();
    renderWizard({ initialEffectiveFrom: "2027-01-01" });
    fireEvent.change(screen.getByLabelText("Percentual de reajuste (%)"), { target: { value: "10" } });
    await next(user);

    const table = screen.getByRole("table");
    expect(within(table).getByLabelText("Novo valor de Ana Lima")).toHaveValue("110,00");
    expect(within(table).getByLabelText("Novo valor de Bia Costa")).toHaveValue("220,00");
    expect(screen.getByTestId("included-count")).toHaveTextContent("3 de 3");

    await user.click(screen.getByRole("checkbox", { name: "Incluir Caio Souza" }));
    expect(screen.getByTestId("included-count")).toHaveTextContent("2 de 3");

    await next(user);
    // Ana +R$ 10 e Bia +R$ 20 (o desconto de R$ 20 continua sobre o novo valor)
    expect(testId("monthly-gain")).toContain("30,00");
    expect(testId("annual-gain")).toContain("360,00");
    expect(screen.getByTestId("departures-reading")).toHaveTextContent(/compensa com até 0 saídas/);
  });

  it("aceita valor manual por aluno e filtra por turma", async () => {
    const user = userEvent.setup();
    renderWizard({ initialEffectiveFrom: "2027-01-01" });
    fireEvent.change(screen.getByLabelText("Percentual de reajuste (%)"), { target: { value: "10" } });
    await next(user);

    fireEvent.change(screen.getByLabelText("Novo valor de Ana Lima"), { target: { value: "105" } });
    await next(user);
    // Ana +5, Bia +20, Caio +15
    expect(testId("monthly-gain")).toContain("40,00");
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    fireEvent.change(screen.getByLabelText("Turma"), { target: { value: "c2" } });
    const table = screen.getByRole("table");
    expect(within(table).queryByLabelText("Novo valor de Ana Lima")).not.toBeInTheDocument();
    expect(within(table).getByLabelText("Novo valor de Caio Souza")).toBeInTheDocument();
    expect(screen.getByTestId("included-count")).toHaveTextContent("1 na lista");
  });

  it("usa o valor de um cenário da calculadora como percentual", () => {
    renderWizard();
    fireEvent.change(screen.getByLabelText("Usar o valor da calculadora"), { target: { value: "sc1" } });
    expect(screen.getByLabelText("Percentual de reajuste (%)")).toHaveValue("39,6");
    expect(screen.getByRole("status")).toHaveTextContent(/A calculadora indica/);
  });

  it("monta a mensagem com modelos, pré-visualização real e contador de caracteres", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderWizard({ initialEffectiveFrom: "2027-01-01" });
    fireEvent.change(screen.getByLabelText("Índice de referência (opcional)"), { target: { value: "IPCA 4,5%" } });
    await next(user);
    await next(user);
    await next(user);

    const preview = screen.getByTestId("message-preview");
    expect(preview).toHaveTextContent("Olá, Ana!");
    expect(preview).toHaveTextContent("Mestre João");
    expect(preview).toHaveTextContent("(IPCA 4,5%)");
    expect(preview.textContent).not.toMatch(/\{[a-z_]+\}/);
    const countBefore = screen.getByTestId("char-count").textContent;

    await user.click(screen.getByRole("radio", { name: /Curto e direto/ }));
    expect((screen.getByLabelText("Texto da mensagem") as HTMLTextAreaElement).value).toContain("a mensalidade de {nome_aluno} passa de");
    expect(screen.getByTestId("char-count").textContent).not.toBe(countBefore);
    expect(screen.getByTestId("message-preview")).toHaveTextContent("a mensalidade de Ana passa de");

    fireEvent.change(screen.getByLabelText("Texto da mensagem"), { target: { value: "Olá {nome}, novo valor {valor_novo} em {vigencia}. {inventada}" } });
    expect(screen.getByRole("alert")).toHaveTextContent("{inventada}");
    expect(screen.getByTestId("message-preview")).toHaveTextContent("Olá Ana, novo valor");

    await user.click(screen.getByRole("button", { name: "Copiar mensagem" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Olá Ana, novo valor")));
  });

  it("salva a campanha com os itens simulados e abre a lista de envio", async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue({ ok: true, id: "adj-9" });
    renderWizard({ initialEffectiveFrom: "2027-01-01" });
    fireEvent.change(screen.getByLabelText("Percentual de reajuste (%)"), { target: { value: "10" } });
    await next(user);
    await user.click(screen.getByRole("checkbox", { name: "Incluir Caio Souza" }));
    await next(user);
    await next(user);
    await user.click(screen.getByRole("button", { name: "Salvar campanha" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const payload = mocks.save.mock.calls[0][0];
    expect(payload).toMatchObject({ mode: "percent", percent: 10, effectiveFrom: "2027-01-01" });
    expect(payload.items).toEqual([
      { enrollmentId: "e1", newFeeCents: 11_000, excluded: false },
      { enrollmentId: "e2", newFeeCents: 22_000, excluded: false },
      { enrollmentId: "e3", newFeeCents: 16_500, excluded: true }
    ]);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/financeiro/reajuste/adj-9"));
  });

  it("mostra o erro do servidor e permanece na tela quando salvar falha", async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue({ ok: false, error: "Não foi possível concluir a operação." });
    renderWizard({ initialEffectiveFrom: "2027-01-01" });
    await next(user);
    await next(user);
    await next(user);
    await user.click(screen.getByRole("button", { name: "Salvar campanha" }));
    expect(await screen.findByText("Não foi possível concluir a operação.")).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
