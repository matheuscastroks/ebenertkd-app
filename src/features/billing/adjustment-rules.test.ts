import { describe, expect, it } from "vitest";
import {
  appliedFromDate,
  buildAdjustmentRows,
  checkNotice,
  computeAdjustmentImpact,
  computeNewFeeCents,
  defaultEffectiveFrom,
  gainAfterDepartures,
  goalCoveragePercent,
  maxTolerableDepartures,
  netFeeCents,
  type AdjustmentConfig,
  type AdjustmentStudent
} from "./adjustment-rules";

const percent = (value: number): AdjustmentConfig => ({ mode: "percent", percent: value, fixedCents: 0, roundToCents: 0 });

function student(id: string, fee: number, extra: Partial<AdjustmentStudent> = {}): AdjustmentStudent {
  return { enrollmentId: `e-${id}`, studentId: `s-${id}`, currentFeeCents: fee, discountCents: 0, contractEnd: null, ...extra };
}

describe("adjustment rules", () => {
  it("reajusta por percentual arredondando ao centavo", () => {
    expect(computeNewFeeCents(15_000, percent(4.5))).toBe(15_675);
    expect(computeNewFeeCents(12_345, percent(3.3))).toBe(12_752);
    expect(computeNewFeeCents(15_000, percent(0))).toBe(15_000);
  });

  it("aceita valor fixo", () => {
    expect(computeNewFeeCents(15_000, { mode: "fixed", percent: 0, fixedCents: 17_000, roundToCents: 0 })).toBe(17_000);
  });

  it("arredonda para cima a múltiplos de R$ 5 ou R$ 10 e nunca reduz o valor", () => {
    const rounded = (step: number, pct = 4.5): AdjustmentConfig => ({ mode: "rounded", percent: pct, fixedCents: 0, roundToCents: step });
    expect(computeNewFeeCents(15_000, rounded(500, 2))).toBe(15_500);
    expect(computeNewFeeCents(15_000, rounded(1_000, 2))).toBe(16_000);
    expect(computeNewFeeCents(15_000, rounded(1_000))).toBe(16_000);
    expect(computeNewFeeCents(15_000, rounded(1_000, 0))).toBe(15_000);
    expect(computeNewFeeCents(14_999, rounded(500, 0))).toBe(15_000);
  });

  it("mantém o desconto em reais: a diferença é a mesma e o líquido não fica negativo", () => {
    expect(netFeeCents(15_000, 2_000)).toBe(13_000);
    expect(netFeeCents(1_000, 5_000)).toBe(0);
    const [row] = buildAdjustmentRows([student("1", 15_000, { discountCents: 2_000 })], percent(10), "2027-01-01");
    expect(row.newFeeCents).toBe(16_500);
    expect(row.diffCents).toBe(1_500);
  });

  it("aplica exceções: aluno excluído fora do impacto e valor manual", () => {
    const rows = buildAdjustmentRows(
      [student("1", 10_000), student("2", 10_000), student("3", 10_000)],
      percent(10),
      "2027-01-01",
      { excluded: new Set(["e-2"]), manualFeeCents: { "e-3": 10_500 } }
    );
    expect(rows.map((row) => row.newFeeCents)).toEqual([11_000, 11_000, 10_500]);
    expect(rows[2].manual).toBe(true);
    const impact = computeAdjustmentImpact(rows, "2026-11-18");
    expect(impact.affectedCount).toBe(2);
    expect(impact.monthlyGainCents).toBe(1_500);
  });

  it("aplica o novo valor só na renovação após a vigência", () => {
    expect(appliedFromDate("2027-03-31", "2027-01-01")).toBe("2027-04-01");
    expect(appliedFromDate("2026-12-01", "2027-01-01")).toBe("2027-01-01");
    expect(appliedFromDate(null, "2027-01-01")).toBe("2027-01-01");
  });

  it("monta a curva de 12 meses conforme cada renovação entra", () => {
    const rows = buildAdjustmentRows(
      [student("1", 10_000, { contractEnd: "2026-11-30" }), student("2", 20_000, { contractEnd: "2027-02-28" })],
      percent(10),
      "2026-12-01"
    );
    const impact = computeAdjustmentImpact(rows, "2026-11-18");
    expect(impact.curve).toHaveLength(12);
    expect(impact.curve[0]).toEqual({ month: "2026-11", gainCents: 0, renewedCount: 0 });
    expect(impact.curve[1]).toEqual({ month: "2026-12", gainCents: 1_000, renewedCount: 1 });
    expect(impact.curve[4]).toEqual({ month: "2027-03", gainCents: 3_000, renewedCount: 2 });
    expect(impact.monthlyGainCents).toBe(3_000);
    expect(impact.annualGainCents).toBe(36_000);
    expect(impact.firstYearGainCents).toBe(1_000 * 3 + 3_000 * 8);
  });

  it("calcula o máximo de saídas tolerável", () => {
    expect(maxTolerableDepartures(120_000, 16_000)).toBe(7);
    expect(maxTolerableDepartures(0, 16_000)).toBe(0);
    expect(maxTolerableDepartures(5_000, 0)).toBe(0);
    expect(gainAfterDepartures(120_000, 16_000, 3)).toBe(72_000);
    const rows = buildAdjustmentRows([student("1", 10_000), student("2", 10_000)], percent(10), "2027-01-01");
    expect(computeAdjustmentImpact(rows, "2026-11-18").maxDepartures).toBe(0);
  });

  it("compara o ganho com a meta de pró-labore", () => {
    expect(goalCoveragePercent(80_000, 100_000)).toBe(80);
    expect(goalCoveragePercent(80_000, 0)).toBeNull();
  });

  it("sugere vigência com pelo menos 30 dias de aviso em dia 1º de mês", () => {
    expect(defaultEffectiveFrom("2026-11-18")).toBe("2027-01-01");
    expect(defaultEffectiveFrom("2026-12-03")).toBe("2027-02-01");
    expect(defaultEffectiveFrom("2026-12-01")).toBe("2027-01-01");
  });

  it("avisa quando a antecedência é menor que 30 dias, sem bloquear", () => {
    const short = checkNotice("2026-11-18", "2026-12-01");
    expect(short.short).toBe(true);
    expect(short.daysOfNotice).toBe(13);
    expect(short.message).toMatch(/30 dias/);
    expect(checkNotice("2026-11-18", "2026-12-18").short).toBe(false);
    expect(checkNotice("2026-11-18", "2026-12-18").message).toBeNull();
    expect(checkNotice("2026-11-18", "2026-11-01").short).toBe(true);
  });
});
