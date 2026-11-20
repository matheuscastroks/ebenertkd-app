import { describe, expect, it } from "vitest";
import { resolveRankConfigs, type RankConfig } from "@/features/academy/belt-rules";
import {
  ageInYears,
  DEFAULT_ELIGIBILITY_EXAM,
  evaluateExamEligibility,
  sortEligibilityAssessments,
  summarizeEligibility,
  type EligibilityContext,
} from "@/features/exams/eligibility-rules";

const ranks = resolveRankConfigs(null);
const context: EligibilityContext = { ranks, exam: DEFAULT_ELIGIBILITY_EXAM };

const withRank = (key: string, patch: Partial<RankConfig>) => ranks.map((rank) => (rank.rank_key === key ? { ...rank, ...patch } : rank));

const base = {
  studentId: "s1",
  fullName: "Carlos Souza",
  currentRankKey: "gub-10",
  beltStartDate: "2026-08-01",
  hasOverdueCharges: false,
  referenceDate: "2026-11-18",
};

describe("eligibility-rules", () => {
  it("marca como elegível quem cumpre carência de dias, presenças e está adimplente", () => {
    const result = evaluateExamEligibility({ ...base, presencesSinceLastBelt: 22 }, context);
    expect(result.status).toBe("eligible");
    expect(result.targetRankKey).toBe("gub-9");
    expect(result.overallProgressPct).toBe(100);
    expect(result.canTakeExam).toBe(true);
  });

  it("sinaliza bloqueio financeiro quando cumpre requisitos mas tem mensalidade vencida", () => {
    const result = evaluateExamEligibility({ ...base, presencesSinceLastBelt: 24, hasOverdueCharges: true }, context);
    expect(result.status).toBe("financial_hold");
    expect(result.meetsRequirements).toBe(true);
    expect(result.canTakeExam).toBe(false);
  });

  it("a política pode liberar quem está em atraso", () => {
    const result = evaluateExamEligibility(
      { ...base, presencesSinceLastBelt: 24, hasOverdueCharges: true },
      { ranks, exam: { ...DEFAULT_ELIGIBILITY_EXAM, block_on_overdue: false } }
    );
    expect(result.status).toBe("eligible");
    expect(result.canTakeExam).toBe(true);
  });

  it("classifica como quase pronto quando o progresso mínimo atinge o limiar da política", () => {
    const input = { ...base, beltStartDate: "2026-09-01", presencesSinceLastBelt: 16 }; // 78 dias, 16/20 = 80%
    const result = evaluateExamEligibility(input, context);
    expect(result.status).toBe("almost_ready");
    expect(result.overallProgressPct).toBe(80);
    const strict = evaluateExamEligibility(input, { ranks, exam: { ...DEFAULT_ELIGIBILITY_EXAM, almost_ready_pct: 90 } });
    expect(strict.status).toBe("in_progress");
  });

  it("identifica aluno já inscrito na próxima banca", () => {
    const result = evaluateExamEligibility(
      { ...base, presencesSinceLastBelt: 25, registeredEventId: "ev1", registeredEventName: "Exame 2º Semestre" },
      context
    );
    expect(result.status).toBe("already_registered");
  });

  it("usa o tempo e as presenças configurados por graduação", () => {
    // Padrão do 10º gub: 90 dias e 20 aulas. Configurado: 30 dias e 5 aulas.
    const configured: EligibilityContext = { ranks: withRank("gub-10", { min_days: 30, min_presences: 5 }), exam: DEFAULT_ELIGIBILITY_EXAM };
    const input = { ...base, beltStartDate: "2026-10-10", presencesSinceLastBelt: 6 }; // 39 dias, 6 aulas
    expect(evaluateExamEligibility(input, context).status).not.toBe("eligible");
    const result = evaluateExamEligibility(input, configured);
    expect(result.status).toBe("eligible");
    expect(result.minDaysRequired).toBe(30);
    expect(result.minPresencesRequired).toBe(5);
    expect(result.minMonthsRequired).toBe(1);
  });

  it("cai no padrão da política quando a graduação não tem tempo próprio", () => {
    const configured: EligibilityContext = {
      ranks: withRank("gub-10", { min_days: null, min_presences: null }),
      exam: { ...DEFAULT_ELIGIBILITY_EXAM, fallback_min_days: 10, fallback_min_presences: 2 },
    };
    const result = evaluateExamEligibility({ ...base, beltStartDate: "2026-11-01", presencesSinceLastBelt: 2 }, configured);
    expect(result.minDaysRequired).toBe(10);
    expect(result.status).toBe("eligible");
  });

  it("avança para a próxima graduação habilitada: sem Poom, o 1º gub vai ao 1º Dan; com Poom, passa por ele", () => {
    const input = { ...base, currentRankKey: "gub-1", beltStartDate: "2026-01-01", presencesSinceLastBelt: 60 };
    expect(evaluateExamEligibility(input, context).targetRankKey).toBe("dan-1");
    const withPoom: EligibilityContext = { ranks: withRank("poom-1", { enabled: true }), exam: DEFAULT_ELIGIBILITY_EXAM };
    expect(evaluateExamEligibility(input, withPoom).targetRankKey).toBe("poom-1");
  });

  it("faixa preta só entra na elegibilidade quando o tempo do Dan é configurado", () => {
    const dan = { ...base, currentRankKey: "dan-1", beltStartDate: "2025-01-01", presencesSinceLastBelt: 200 };
    expect(evaluateExamEligibility(dan, context).status).toBe("black_belt");
    const configured: EligibilityContext = { ranks: withRank("dan-1", { min_days: 365, min_presences: 100 }), exam: DEFAULT_ELIGIBILITY_EXAM };
    const result = evaluateExamEligibility(dan, configured);
    expect(result.status).toBe("eligible");
    expect(result.targetRankKey).toBe("dan-2");
  });

  it("na última graduação habilitada não há alvo", () => {
    const result = evaluateExamEligibility({ ...base, currentRankKey: "dan-3", presencesSinceLastBelt: 500 }, context);
    expect(result.status).toBe("black_belt");
    expect(result.targetRankKey).toBeNull();
  });

  it("aluno sem graduação fica em andamento, sem alvo", () => {
    const result = evaluateExamEligibility({ ...base, currentRankKey: null, presencesSinceLastBelt: 50 }, context);
    expect(result.status).toBe("in_progress");
    expect(result.targetRankKey).toBeNull();
  });

  it("idade mínima da graduação alvo bloqueia quem é mais novo, mas não quem não informou nascimento", () => {
    const configured: EligibilityContext = {
      ranks: withRank("dan-1", { min_age_years: 15 }),
      exam: DEFAULT_ELIGIBILITY_EXAM,
    };
    const input = { ...base, currentRankKey: "gub-1", beltStartDate: "2026-01-01", presencesSinceLastBelt: 60 };
    const young = evaluateExamEligibility({ ...input, birthDate: "2013-06-01" }, configured);
    expect(young.ageBlocked).toBe(true);
    expect(young.status).toBe("in_progress");
    expect(young.minAgeRequired).toBe(15);
    expect(evaluateExamEligibility({ ...input, birthDate: "2008-06-01" }, configured).status).toBe("eligible");
    expect(evaluateExamEligibility(input, configured).status).toBe("eligible");
    expect(ageInYears("2008-11-19", "2026-11-18")).toBe(17);
    expect(ageInYears("2008-11-18", "2026-11-18")).toBe(18);
  });

  it("ordena e resume a distribuição por graduação", () => {
    const black = evaluateExamEligibility({ ...base, studentId: "s2", currentRankKey: "dan-1", presencesSinceLastBelt: 50 }, context);
    expect(black.status).toBe("black_belt");
    expect(black.targetRankKey).toBeNull();

    const eligible = evaluateExamEligibility({ ...base, presencesSinceLastBelt: 21 }, context);
    const sorted = sortEligibilityAssessments([black, eligible]);
    expect(sorted[0].studentId).toBe("s1");

    const summary = summarizeEligibility(sorted);
    expect(summary.eligibleCount).toBe(1);
    expect(summary.byRank).toHaveLength(1);
    expect(summary.byRank[0]).toMatchObject({ rankKey: "gub-10", eligible: 1 });
  });
});
