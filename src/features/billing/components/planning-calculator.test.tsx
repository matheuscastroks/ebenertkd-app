import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanningBaseline } from "@/features/billing/planning-baseline";
import type { SavedScenario } from "@/features/billing/planning-service";

const actions = vi.hoisted(() => ({
  save: vi.fn(),
  remove: vi.fn()
}));

vi.mock("@/app/actions/tuition-adjustment", () => ({
  saveFinanceScenarioAction: actions.save,
  deleteFinanceScenarioAction: actions.remove
}));
vi.mock("@/features/billing/components/planning-chart", () => ({ PlanningChart: () => <div data-testid="chart" /> }));

import { PlanningCalculator } from "./planning-calculator";

const baseline: PlanningBaseline = {
  activeStudents: 42,
  awaitingRenewalStudents: 2,
  averageFeeCents: 15_000,
  feeDistribution: [{ feeCents: 14_000, count: 10 }, { feeCents: 15_000, count: 32 }],
  feeDistributionOtherCount: 0,
  defaultRatePercent: 0,
  realizedLast3MonthsCents: 600_000,
  monthsConsidered: 3
};

const text = (testId: string) => screen.getByTestId(testId).textContent?.replace(/\s/g, " ") ?? "";

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("PlanningCalculator", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it("pré-preenche alunos e mensalidade reais e mostra o valor real ao editar", async () => {
    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    expect(screen.getByLabelText("Alunos que pagam mensalidade")).toHaveValue("42");
    expect(screen.getByLabelText("Mensalidade média (R$)")).toHaveValue("150,00");
    expect(screen.getByText(/32 × .*150,00/)).toBeInTheDocument();
    fill("Alunos que pagam mensalidade", "30");
    expect(screen.getByText("Valor real: 42")).toBeInTheDocument();
  });

  it("alterar alunos e mensalidade atualiza folga e ponto de equilíbrio", () => {
    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Aluguel", "2000");
    fill("Meta de pró-labore (R$)", "4000");

    // 42 × R$ 150 = R$ 6.300 contra necessidade de R$ 6.000
    expect(text("monthly-margin")).toContain("300,00");
    expect(text("break-even")).toContain("14 alunos");
    expect(screen.getByText("Folga do mês")).toBeInTheDocument();

    fill("Alunos que pagam mensalidade", "30");
    expect(text("monthly-margin")).toContain("1.500,00");
    expect(screen.getByText("Déficit do mês")).toBeInTheDocument();
    expect(text("reading")).toMatch(/faltam .* Seriam necessários 40 alunos/);

    fill("Mensalidade média (R$)", "200");
    // 30 × 200 = 6.000: fecha exatamente
    expect(text("monthly-margin")).toContain("0,00");
    expect(screen.getByText("Folga do mês")).toBeInTheDocument();
    expect(text("break-even")).toContain("10 alunos");
  });

  it("mostra mensalidade necessária e alunos necessários nas abas", async () => {
    const user = userEvent.setup();
    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Aluguel", "2000");
    fill("Meta de pró-labore (R$)", "4000");

    expect(text("required-fee")).toContain("142,86");

    await user.click(screen.getByRole("tab", { name: "Quantos alunos preciso?" }));
    expect(text("students-goal")).toBe("40");
    expect(text("students-break-even")).toBe("14");

    fill("Mensalidade média (R$)", "100");
    expect(text("students-goal")).toBe("60");
  });

  it("explica quando cada aluno dá prejuízo", async () => {
    const user = userEvent.setup();
    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Custo por aluno (R$)", "200");
    await user.click(screen.getByRole("tab", { name: "Quantos alunos preciso?" }));
    expect(screen.getAllByText(/cada aluno dá prejuízo/).length).toBeGreaterThan(0);
  });

  it("modo 'E se...?': atalho 'Perdi 5 alunos' e controles recalculam o cenário sem mudar os números reais", async () => {
    const user = userEvent.setup();
    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Aluguel", "2000");
    fill("Meta de pró-labore (R$)", "4000");
    await user.click(screen.getByRole("tab", { name: "E se...?" }));

    await user.click(screen.getByRole("button", { name: "Perdi 5 alunos" }));
    expect(text("whatif-students")).toBe("37");
    // 37 × 150 = 5.550 contra 6.000
    expect(text("whatif-margin")).toContain("450,00");
    expect(screen.getByText("Déficit do mês")).toBeInTheDocument();
    expect(screen.queryByText(/abaixo do ponto de equilíbrio/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Mensalidade: /), { target: { value: "10" } });
    // 37 × 165 = 6.105
    expect(text("whatif-margin")).toContain("105,00");

    fireEvent.change(screen.getByLabelText(/^Alunos: /), { target: { value: "-10" } });
    fireEvent.change(screen.getByLabelText(/^Mensalidade: /), { target: { value: "-20" } });
    // 32 × 120 = 3.840 < custos fixos de 2.000? não: 3.840 > 2.000, mas abaixo da meta
    expect(text("whatif-margin")).toContain("2.160,00");

    fill("Contratar instrutor (R$/mês)", "1900");
    await user.click(screen.getAllByRole("button", { name: "Aplicar" })[0]);
    // custos fixos 3.900 > receita 3.840: abaixo do ponto de equilíbrio
    expect(screen.getByText(/abaixo do ponto de equilíbrio/)).toBeInTheDocument();
    // os números reais continuam os mesmos
    expect(text("current-students")).toBe("42");
  });

  it("guarda o rascunho dos custos no navegador e o recarrega", async () => {
    const { unmount } = render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Aluguel", "1800");
    await waitFor(() => expect(window.localStorage.getItem("ebenertkd:calculadora-mensalidade:v1")).toContain("1800"));
    unmount();

    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    await waitFor(() => expect(screen.getByLabelText("Aluguel")).toHaveValue("1800"));
  });

  it("segue funcionando quando o armazenamento do navegador falha", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Aluguel", "1000");
    expect(screen.getByLabelText("Aluguel")).toHaveValue("1000");
  });

  it("salva, carrega e exclui cenários no servidor", async () => {
    const user = userEvent.setup();
    const saved: SavedScenario = {
      id: "sc1",
      name: "Com instrutor",
      fixedCosts: [{ label: "Aluguel", amountCents: 250_000 }],
      variableCostCents: 0,
      paymentFeePercent: 0,
      proLaboreCents: 400_000,
      reserveCents: 0,
      defaultRatePercent: 5,
      updatedAt: "2026-11-18T10:00:00.000Z"
    };
    actions.save.mockResolvedValue({ ok: true, scenario: saved });
    actions.remove.mockResolvedValue({ ok: true });

    render(<PlanningCalculator baseline={baseline} scenarios={[]} />);
    fill("Aluguel", "2500");
    fill("Meta de pró-labore (R$)", "4000");
    expect(screen.getByRole("button", { name: "Salvar cenário" })).toBeDisabled();
    fill("Nome do cenário", "Com instrutor");
    await user.click(screen.getByRole("button", { name: "Salvar cenário" }));

    await waitFor(() => expect(actions.save).toHaveBeenCalledTimes(1));
    expect(actions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Com instrutor",
        fixedCosts: [{ label: "Aluguel", amountCents: 250_000 }],
        proLaboreCents: 400_000
      })
    );
    expect(await screen.findByText("Com instrutor")).toBeInTheDocument();

    fill("Aluguel", "0");
    await user.click(screen.getByRole("button", { name: "Carregar" }));
    expect(screen.getByLabelText("Aluguel")).toHaveValue("2500,00");
    expect(screen.getByLabelText("Inadimplência esperada (%)")).toHaveValue("5");

    await user.click(screen.getByRole("button", { name: "Excluir cenário Com instrutor" }));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith("sc1"));
    await waitFor(() => expect(screen.queryByText("Nenhum cenário salvo ainda.")).toBeInTheDocument());
  });
});
