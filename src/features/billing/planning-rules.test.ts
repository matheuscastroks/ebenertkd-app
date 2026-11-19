import { describe, expect, it } from "vitest";
import {
  applyWhatIf,
  breakEvenStudents,
  buildPlanningReading,
  buildRevenueCurve,
  effectiveRevenuePerStudentCents,
  evaluateScenario,
  monthlyMarginCents,
  monthlyNeedCents,
  requiredFeeCents,
  requiredStudents,
  sanitizePlanningInput,
  type PlanningInput
} from "./planning-rules";

const base: PlanningInput = {
  fixedCostsCents: 200_000,
  proLaboreCents: 400_000,
  reserveCents: 30_000,
  variableCostCents: 0,
  paymentFeePercent: 0,
  defaultRatePercent: 0
};

describe("planning rules", () => {
  it("soma custos fixos, pró-labore e reserva como necessidade mensal", () => {
    expect(monthlyNeedCents(base)).toBe(630_000);
  });

  it("calcula a mensalidade necessária arredondando para cima", () => {
    expect(requiredFeeCents(42, base)).toEqual({ ok: true, value: 15_000 });
    expect(requiredFeeCents(43, base)).toEqual({ ok: true, value: 14_652 });
  });

  it("considera inadimplência, taxa de pagamento e custo variável", () => {
    const input = { ...base, variableCostCents: 1_000, defaultRatePercent: 10, paymentFeePercent: 5 };
    expect(requiredFeeCents(40, input)).toEqual({ ok: true, value: 19_591 });
    expect(effectiveRevenuePerStudentCents(20_000, input)).toBe(Math.round(20_000 * 0.855 - 1_000));
  });

  it("calcula alunos necessários e ponto de equilíbrio sem pró-labore nem reserva", () => {
    expect(requiredStudents(15_000, base)).toEqual({ ok: true, value: 42 });
    expect(requiredStudents(14_999, base)).toEqual({ ok: true, value: 43 });
    expect(breakEvenStudents(15_000, base)).toEqual({ ok: true, value: 14 });
    expect(breakEvenStudents(15_000, { ...base, fixedCostsCents: 210_001 })).toEqual({ ok: true, value: 15 });
  });

  it("calcula folga e déficit mensal", () => {
    expect(monthlyMarginCents(50, 15_000, base)).toBe(120_000);
    expect(monthlyMarginCents(30, 15_000, base)).toBe(-180_000);
    const scenario = evaluateScenario(30, 15_000, base);
    expect(scenario.yearlyMarginCents).toBe(-2_160_000);
    expect(scenario.coversGoal).toBe(false);
    expect(scenario.coversFixedCosts).toBe(true);
  });

  it("zero alunos: não calcula mensalidade e a folga é o déficit total", () => {
    expect(requiredFeeCents(0, base)).toEqual({ ok: false, reason: "no_students" });
    expect(monthlyMarginCents(0, 15_000, base)).toBe(-630_000);
    expect(buildPlanningReading(0, 15_000, base)).toMatch(/Informe quantos alunos/);
  });

  it("receita efetiva menor ou igual a zero indica prejuízo por aluno", () => {
    const loss = { ...base, variableCostCents: 20_000 };
    expect(effectiveRevenuePerStudentCents(15_000, loss)).toBeLessThan(0);
    expect(requiredStudents(15_000, loss)).toEqual({ ok: false, reason: "loss_per_student" });
    expect(breakEvenStudents(15_000, loss)).toEqual({ ok: false, reason: "loss_per_student" });
    expect(buildPlanningReading(10, 15_000, loss)).toMatch(/cada aluno dá prejuízo/);
    expect(requiredStudents(20_000, loss)).toEqual({ ok: false, reason: "loss_per_student" });
  });

  it("inadimplência de 100% torna qualquer mensalidade insuficiente", () => {
    const input = { ...base, defaultRatePercent: 100 };
    expect(requiredFeeCents(40, input)).toEqual({ ok: false, reason: "unreachable" });
    expect(requiredStudents(15_000, input)).toEqual({ ok: false, reason: "loss_per_student" });
  });

  it("trata valores vazios, negativos e inválidos como zero", () => {
    const messy = sanitizePlanningInput({
      fixedCostsCents: Number.NaN,
      proLaboreCents: -5,
      reserveCents: Number.POSITIVE_INFINITY,
      variableCostCents: Number.NaN,
      paymentFeePercent: 250,
      defaultRatePercent: -3
    });
    expect(messy).toEqual({ fixedCostsCents: 0, proLaboreCents: 0, reserveCents: 0, variableCostCents: 0, paymentFeePercent: 100, defaultRatePercent: 0 });
    const empty = { fixedCostsCents: 0, proLaboreCents: 0, reserveCents: 0, variableCostCents: 0, paymentFeePercent: 0, defaultRatePercent: 0 };
    expect(requiredFeeCents(10, empty)).toEqual({ ok: true, value: 0 });
    expect(requiredStudents(15_000, empty)).toEqual({ ok: true, value: 0 });
  });

  it("arredonda centavos sempre para cima na mensalidade necessária", () => {
    const input = { ...base, fixedCostsCents: 1, proLaboreCents: 0, reserveCents: 0 };
    expect(requiredFeeCents(3, input)).toEqual({ ok: true, value: 1 });
    expect(requiredFeeCents(1, { ...base, fixedCostsCents: 100_001, proLaboreCents: 0, reserveCents: 0 })).toEqual({ ok: true, value: 100_001 });
  });

  it("aplica os ajustes do 'E se...?' sem deixar alunos ou mensalidade negativos", () => {
    expect(applyWhatIf(42, 15_000, -5, 10)).toEqual({ students: 37, feeCents: 16_500 });
    expect(applyWhatIf(3, 15_000, -10, -50)).toEqual({ students: 0, feeCents: 7_500 });
  });

  it("gera a frase de leitura humana", () => {
    const text = buildPlanningReading(50, 15_000, base);
    expect(text).toContain("Com 50 alunos a");
    expect(text).toMatch(/sobram/);
    expect(text).toMatch(/aguenta perder até 36 alunos/);
    expect(buildPlanningReading(30, 15_000, base)).toMatch(/faltam .* Seriam necessários 42 alunos/);
  });

  it("monta a curva do gráfico com o último ponto no limite", () => {
    const curve = buildRevenueCurve(15_000, base, 60);
    expect(curve[0]).toMatchObject({ students: 0, revenueCents: 0, needCents: 630_000 });
    expect(curve.at(-1)?.students).toBe(60);
    expect(curve.at(-1)?.revenueCents).toBe(900_000);
  });
});
