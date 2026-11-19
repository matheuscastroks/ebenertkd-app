import { describe, expect, it } from "vitest";
import {
  evaluateStudentRetention,
  sortRetentionAssessments,
  summarizeRetentionCohort,
} from "@/features/classes/retention-rules";

const baseInput = {
  studentId: "s1",
  profileId: "p1",
  fullName: "Lucas Silva",
  rankKey: "gub-8",
  trainingClassId: "c1",
  trainingClassName: "Juvenil Noite",
  enrollmentCreatedAt: "2026-08-01T12:00:00Z",
  referenceDate: "2026-11-18",
};

describe("retention-rules", () => {
  it("classifica 3 ou mais faltas consecutivas como risco crítico", () => {
    const result = evaluateStudentRetention({
      ...baseInput,
      attendanceEntries: [
        { lessonDate: "2026-11-16", status: "absent" },
        { lessonDate: "2026-11-13", status: "absent" },
        { lessonDate: "2026-11-11", status: "absent" },
        { lessonDate: "2026-11-09", status: "present" },
      ],
    });
    expect(result.riskLevel).toBe("critical");
    expect(result.consecutiveAbsences).toBe(3);
    expect(result.riskReason).toContain("3 faltas seguidas");
  });

  it("interrompe a sequência de faltas quando há falta abonada (excused)", () => {
    const result = evaluateStudentRetention({
      ...baseInput,
      attendanceEntries: [
        { lessonDate: "2026-11-16", status: "absent" },
        { lessonDate: "2026-11-13", status: "excused" },
        { lessonDate: "2026-11-11", status: "absent" },
        { lessonDate: "2026-11-09", status: "present" },
        { lessonDate: "2026-11-06", status: "present" },
        { lessonDate: "2026-11-04", status: "present" },
        { lessonDate: "2026-11-02", status: "present" },
        { lessonDate: "2026-10-30", status: "present" },
        { lessonDate: "2026-10-28", status: "present" },
      ],
    });
    expect(result.consecutiveAbsences).toBe(1);
    expect(result.rate30d).toBe(75);
    expect(result.riskLevel).toBe("healthy");
  });

  it("classifica ausência entre 14 e 20 dias como atenção e >= 21 dias como crítico", () => {
    const warning = evaluateStudentRetention({
      ...baseInput,
      attendanceEntries: [{ lessonDate: "2026-11-03", status: "present" }],
    });
    expect(warning.riskLevel).toBe("warning");
    expect(warning.daysSinceLastPresent).toBe(15);

    const critical = evaluateStudentRetention({
      ...baseInput,
      attendanceEntries: [{ lessonDate: "2026-10-25", status: "present" }],
    });
    expect(critical.riskLevel).toBe("critical");
    expect(critical.daysSinceLastPresent).toBe(24);
  });

  it("classifica frequência menor que 50% em 30 dias como risco crítico", () => {
    const result = evaluateStudentRetention({
      ...baseInput,
      attendanceEntries: [
        { lessonDate: "2026-11-16", status: "present" },
        { lessonDate: "2026-11-13", status: "absent" },
        { lessonDate: "2026-11-11", status: "absent" },
        { lessonDate: "2026-11-09", status: "absent" },
      ],
    });
    expect(result.rate30d).toBe(25);
    expect(result.riskLevel).toBe("critical");
  });

  it("ordena críticos primeiro e resume coorte por turma e saldo mensal", () => {
    const healthy = evaluateStudentRetention({
      ...baseInput,
      studentId: "s1",
      fullName: "Ana",
      attendanceEntries: [{ lessonDate: "2026-11-16", status: "present" }],
    });
    const critical = evaluateStudentRetention({
      ...baseInput,
      studentId: "s2",
      fullName: "Bruno",
      attendanceEntries: [{ lessonDate: "2026-10-15", status: "present" }],
    });
    const sorted = sortRetentionAssessments([healthy, critical]);
    expect(sorted[0].studentId).toBe("s2");

    const summary = summarizeRetentionCohort(sorted, 5, 2);
    expect(summary.totalActive).toBe(2);
    expect(summary.criticalCount).toBe(1);
    expect(summary.healthyCount).toBe(1);
    expect(summary.netGrowthInMonth).toBe(3);
    expect(summary.byClass[0]).toMatchObject({ className: "Juvenil Noite", critical: 1, healthy: 1 });
  });
});
