import { describe, expect, it } from "vitest";
import {
  evaluateExamEligibility,
  sortEligibilityAssessments,
  summarizeEligibility,
} from "@/features/exams/eligibility-rules";

const base = {
  studentId: "s1",
  fullName: "Carlos Souza",
  currentBelt: "Branca",
  currentGub: 10,
  beltStartDate: "2026-08-01",
  hasOverdueCharges: false,
  referenceDate: "2026-11-18",
};

describe("eligibility-rules", () => {
  it("marca como elegível quem cumpre carência de dias, presenças e está adimplente", () => {
    const result = evaluateExamEligibility({
      ...base,
      presencesSinceLastBelt: 22,
    });
    expect(result.status).toBe("eligible");
    expect(result.targetGub).toBe(9);
    expect(result.targetBelt).toBe("Ponta Amarela");
    expect(result.overallProgressPct).toBe(100);
  });

  it("sinaliza bloqueio financeiro quando cumpre requisitos mas tem mensalidade vencida", () => {
    const result = evaluateExamEligibility({
      ...base,
      presencesSinceLastBelt: 24,
      hasOverdueCharges: true,
    });
    expect(result.status).toBe("financial_hold");
  });

  it("classifica como quase pronto quando progresso mínimo atinge 75%", () => {
    const result = evaluateExamEligibility({
      ...base,
      beltStartDate: "2026-09-01", // 78 dias (~87%)
      presencesSinceLastBelt: 16, // 16/20 = 80%
    });
    expect(result.status).toBe("almost_ready");
    expect(result.overallProgressPct).toBe(80);
  });

  it("identifica aluno já inscrito na próxima banca", () => {
    const result = evaluateExamEligibility({
      ...base,
      presencesSinceLastBelt: 25,
      registeredEventId: "ev1",
      registeredEventName: "Exame 2º Semestre",
    });
    expect(result.status).toBe("already_registered");
  });

  it("trata faixa preta sem erro e resume distribuição por graduação", () => {
    const black = evaluateExamEligibility({
      ...base,
      studentId: "s2",
      currentBelt: "Preta",
      currentGub: 0,
      presencesSinceLastBelt: 50,
    });
    expect(black.status).toBe("black_belt");
    expect(black.targetGub).toBeNull();

    const eligible = evaluateExamEligibility({ ...base, presencesSinceLastBelt: 21 });
    const sorted = sortEligibilityAssessments([black, eligible]);
    expect(sorted[0].studentId).toBe("s1");

    const summary = summarizeEligibility(sorted);
    expect(summary.eligibleCount).toBe(1);
    expect(summary.byBelt).toHaveLength(1);
    expect(summary.byBelt[0]).toMatchObject({ gub: 10, eligible: 1 });
  });
});
