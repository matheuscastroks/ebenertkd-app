import { describe, expect, it } from "vitest";
import type { BeltHistory } from "@/features/exams/types";
import {
  buildBeltRoadmap,
  buildMonthlyAttendanceSeries,
  buildStudentReadiness,
} from "@/features/students/journey-rules";

const makeHistory = (newGub: number, achievedAt: string): BeltHistory => ({
  $id: `bh-${newGub}`,
  $sequence: "1",
  $createdAt: achievedAt,
  $updatedAt: achievedAt,
  $permissions: [],
  $databaseId: "db",
  $tableId: "belt_history",
  student_id: "s1",
  event_id: "ev1",
  exam_participant_id: `ep-${newGub}`,
  previous_belt: "Branca",
  previous_gub: newGub + 1,
  new_belt: "Amarela",
  new_gub: newGub as BeltHistory["new_gub"],
  achieved_at: achievedAt,
  created_at: achievedAt,
});

describe("journey-rules", () => {
  it("monta a trilha de 11 degraus marcando faixas conquistadas, atual, próxima e futuras", () => {
    const roadmap = buildBeltRoadmap({
      currentGub: 8,
      currentBelt: "Amarela",
      beltHistory: [makeHistory(9, "2026-04-10T12:00:00Z"), makeHistory(8, "2026-08-15T12:00:00Z")],
    });
    expect(roadmap).toHaveLength(11);
    expect(roadmap.find((s) => s.gub === 10)?.state).toBe("achieved");
    expect(roadmap.find((s) => s.gub === 9)?.achievedAt).toBe("2026-04-10");
    expect(roadmap.find((s) => s.gub === 8)?.state).toBe("current");
    expect(roadmap.find((s) => s.gub === 7)?.state).toBe("next");
    expect(roadmap.find((s) => s.gub === 0)?.state).toBe("upcoming");
  });

  it("calcula prontidão puramente pedagógica sem misturar financeiro", () => {
    const readiness = buildStudentReadiness({
      currentGub: 8,
      currentBelt: "Amarela",
      beltStartDate: "2026-08-15",
      presencesSinceLastBelt: 18,
      referenceDate: "2026-11-18",
    });
    expect(readiness.targetBelt).toBe("Ponta Verde");
    expect(readiness.currentPoomsae).toBe("Taegeuk Il Jang");
    expect(readiness.nextPoomsae).toBe("Taegeuk Ee Jang");
    expect(readiness.minPresencesRequired).toBe(24);
    expect(readiness.remainingPresences).toBe(6);
    expect(readiness.timeProgressPct).toBe(100);
    expect(readiness.presenceProgressPct).toBe(75);
    expect(readiness.isPedagogicallyReady).toBe(false);
  });

  it("trata faixa preta corretamente e agrega série mensal dos últimos 6 meses", () => {
    const black = buildStudentReadiness({
      currentGub: 0,
      currentBelt: "Preta",
      presencesSinceLastBelt: 40,
      referenceDate: "2026-11-18",
    });
    expect(black.isBlackBelt).toBe(true);
    expect(black.targetGub).toBeNull();

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
});
