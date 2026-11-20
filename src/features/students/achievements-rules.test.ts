import { describe, expect, it } from "vitest";
import { buildStudentConsistencyReport } from "@/features/students/achievements-rules";

describe("achievements-rules", () => {
  it("calcula sequência semanal sem punir falta abonada (excused) e desbloqueia conquistas", () => {
    const report = buildStudentConsistencyReport({
      entries: [
        { lessonDate: "2026-11-16", status: "present" }, // semana atual
        { lessonDate: "2026-11-10", status: "excused" }, // semana -1 (abonada mantém sequência)
        { lessonDate: "2026-11-03", status: "present" }, // semana -2
        { lessonDate: "2026-10-27", status: "present" }, // semana -3
        { lessonDate: "2026-10-20", status: "present" }, // semana -4
        { lessonDate: "2026-10-15", status: "present" },
        { lessonDate: "2026-10-08", status: "present" },
        { lessonDate: "2026-10-01", status: "present" },
      ],
      beltHistory: [],
      startedAt: "2025-10-01T12:00:00Z",
      referenceDate: "2026-11-18",
    });

    expect(report.totalPresences).toBe(7);
    expect(report.currentWeekStreak).toBe(8);
    expect(report.bestWeekStreak).toBe(8);
    expect(report.perfectMonthsCount).toBe(1); // outubro: 5 presenças, 0 faltas
    expect(report.badges.find((b) => b.id === "streak-4w")?.unlocked).toBe(true);
    expect(report.badges.find((b) => b.id === "perfect-month")?.unlocked).toBe(true);
    expect(report.badges.find((b) => b.id === "one-year")?.unlocked).toBe(true);
    expect(report.badges.find((b) => b.id === "lessons-25")?.unlocked).toBe(false);
    expect(report.heatmapWeeks).toHaveLength(20);
    expect(report.heatmapWeeks[0]).toHaveLength(7);
  });

  it("retorna zeros limpos quando aluno ainda não possui presenças", () => {
    const report = buildStudentConsistencyReport({
      entries: [],
      beltHistory: [],
      referenceDate: "2026-11-18",
    });
    expect(report.totalPresences).toBe(0);
    expect(report.currentWeekStreak).toBe(0);
    expect(report.unlockedCount).toBe(0);
  });
});
