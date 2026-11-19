import { describe, expect, it } from "vitest";
import { resolveRankConfigs, toPublicRank, type RankConfig } from "@/features/academy/belt-rules";
import { DEFAULT_ELIGIBILITY_EXAM } from "@/features/exams/eligibility-rules";
import {
  buildBeltRoadmap,
  buildMonthlyAttendanceSeries,
  buildStudentReadiness,
  resolveStudentRank,
} from "@/features/students/journey-rules";

const ranks = resolveRankConfigs(null);
const context = { ranks, exam: DEFAULT_ELIGIBILITY_EXAM };
const publicRanks = ranks.map(toPublicRank);

const withRank = (key: string, patch: Partial<RankConfig>) => ranks.map((rank) => (rank.rank_key === key ? { ...rank, ...patch } : rank));

const history = (newKey: string, newName: string, achievedAt: string) => ({ new_rank_key: newKey, new_belt_name: newName, achieved_at: achievedAt });

describe("journey-rules", () => {
  it("monta a trilha das graduações habilitadas marcando conquistadas, atual, próxima e futuras", () => {
    const roadmap = buildBeltRoadmap({
      currentRankKey: "gub-8",
      beltHistory: [history("gub-9", "Ponta Amarela", "2026-04-10T12:00:00Z"), history("gub-8", "Amarela", "2026-08-15T12:00:00Z")],
      ranks: publicRanks,
    });
    // 10 gubs + Dan 1 a 3: Poom e Dan 4-9 começam desativados.
    expect(roadmap).toHaveLength(13);
    expect(roadmap.find((s) => s.rankKey === "poom-1")).toBeUndefined();
    expect(roadmap.find((s) => s.rankKey === "gub-10")?.state).toBe("achieved");
    expect(roadmap.find((s) => s.rankKey === "gub-9")?.achievedAt).toBe("2026-04-10");
    expect(roadmap.find((s) => s.rankKey === "gub-9")?.achievedName).toBe("Ponta Amarela");
    expect(roadmap.find((s) => s.rankKey === "gub-8")?.state).toBe("current");
    expect(roadmap.find((s) => s.rankKey === "gub-7")?.state).toBe("next");
    expect(roadmap.find((s) => s.rankKey === "dan-1")?.state).toBe("upcoming");
  });

  it("pula o Poom desativado, mas passa por ele quando habilitado", () => {
    const base = { currentRankKey: "gub-1", beltHistory: [] };
    expect(buildBeltRoadmap({ ...base, ranks: publicRanks }).find((s) => s.state === "next")?.rankKey).toBe("dan-1");
    const withPoom = withRank("poom-1", { enabled: true }).map(toPublicRank);
    expect(buildBeltRoadmap({ ...base, ranks: withPoom }).find((s) => s.state === "next")?.rankKey).toBe("poom-1");
  });

  it("o histórico guarda o nome da época mesmo depois de renomear a graduação", () => {
    const renamed = withRank("gub-9", { display_name: "Laranja" }).map(toPublicRank);
    const roadmap = buildBeltRoadmap({ currentRankKey: "gub-8", beltHistory: [history("gub-9", "Ponta Amarela", "2026-04-10T12:00:00Z")], ranks: renamed });
    expect(roadmap.find((s) => s.rankKey === "gub-9")?.achievedName).toBe("Ponta Amarela");
  });

  it("calcula prontidão puramente pedagógica sem misturar financeiro", () => {
    const readiness = buildStudentReadiness(
      { currentRankKey: "gub-8", beltStartDate: "2026-08-15", presencesSinceLastBelt: 18, referenceDate: "2026-11-18" },
      context
    );
    expect(readiness.targetRankKey).toBe("gub-7");
    expect(readiness.currentForm).toBe("Taegeuk Il Jang");
    expect(readiness.nextForm).toBe("Taegeuk Ee Jang");
    expect(readiness.minPresencesRequired).toBe(24);
    expect(readiness.remainingPresences).toBe(6);
    expect(readiness.timeProgressPct).toBe(100);
    expect(readiness.presenceProgressPct).toBe(75);
    expect(readiness.isPedagogicallyReady).toBe(false);
  });

  it("usa o tempo e as presenças configurados para a graduação", () => {
    const configured = withRank("gub-8", { min_days: 30, min_presences: 10 });
    const readiness = buildStudentReadiness(
      { currentRankKey: "gub-8", beltStartDate: "2026-10-15", presencesSinceLastBelt: 10, referenceDate: "2026-11-18" },
      { ranks: configured, exam: DEFAULT_ELIGIBILITY_EXAM }
    );
    expect(readiness.minDaysRequired).toBe(30);
    expect(readiness.minPresencesRequired).toBe(10);
    expect(readiness.isPedagogicallyReady).toBe(true);
  });

  it("sem graduação informada trata o aluno como iniciante", () => {
    expect(resolveStudentRank(null)).toBe("gub-10");
    expect(resolveStudentRank("lixo")).toBe("gub-10");
    const readiness = buildStudentReadiness({ presencesSinceLastBelt: 0, referenceDate: "2026-11-18" }, context);
    expect(readiness.currentRankKey).toBe("gub-10");
    expect(readiness.targetRankKey).toBe("gub-9");
  });

  it("não avalia faixa preta sem tempo configurado e agrega a série mensal dos últimos 6 meses", () => {
    const black = buildStudentReadiness({ currentRankKey: "dan-1", presencesSinceLastBelt: 40, referenceDate: "2026-11-18" }, context);
    expect(black.isBlackBelt).toBe(true);
    expect(black.targetRankKey).toBeNull();

    // Com tempo configurado, o 1º Dan passa a ter meta para o 2º Dan.
    const configured = buildStudentReadiness(
      { currentRankKey: "dan-1", beltStartDate: "2025-11-18", presencesSinceLastBelt: 40, referenceDate: "2026-11-18" },
      { ranks: withRank("dan-1", { min_days: 365, min_presences: 100 }), exam: DEFAULT_ELIGIBILITY_EXAM }
    );
    expect(configured.targetRankKey).toBe("dan-2");
    expect(configured.isBlackBelt).toBe(false);
    expect(configured.remainingPresences).toBe(60);

    const series = buildMonthlyAttendanceSeries(
      [
        { lessonDate: "2026-11-05", status: "present" },
        { lessonDate: "2026-11-07", status: "absent" },
        { lessonDate: "2026-10-12", status: "excused" },
      ],
      6,
      "2026-11-18"
    );
    expect(series).toHaveLength(6);
    expect(series.at(-1)).toMatchObject({ competence: "2026-11", present: 1, absent: 1, excused: 0 });
    expect(series.at(-2)).toMatchObject({ competence: "2026-10", excused: 1 });
  });

  it("respeita a idade mínima da graduação alvo", () => {
    const configured = withRank("dan-1", { min_age_years: 15 });
    const input = { currentRankKey: "gub-1", beltStartDate: "2026-01-01", presencesSinceLastBelt: 60, referenceDate: "2026-11-18" };
    const young = buildStudentReadiness({ ...input, birthDate: "2013-01-01" }, { ranks: configured, exam: DEFAULT_ELIGIBILITY_EXAM });
    expect(young.ageBlocked).toBe(true);
    expect(young.isPedagogicallyReady).toBe(false);
    const adult = buildStudentReadiness({ ...input, birthDate: "2000-01-01" }, { ranks: configured, exam: DEFAULT_ELIGIBILITY_EXAM });
    expect(adult.ageBlocked).toBe(false);
    expect(adult.isPedagogicallyReady).toBe(true);
  });
});
