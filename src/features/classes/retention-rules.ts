import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type RetentionRiskLevel = "critical" | "warning" | "healthy";

export type RetentionAttendanceEntry = {
  lessonDate: string;
  status: "present" | "absent" | "excused";
};

export type EvaluateStudentRetentionInput = {
  studentId: string;
  profileId: string;
  fullName: string;
  rankKey?: string | null;
  trainingClassId?: string | null;
  trainingClassName?: string | null;
  whatsapp?: string | null;
  guardianContact?: string | null;
  photoDocumentId?: string | null;
  enrollmentCreatedAt: string;
  attendanceEntries: RetentionAttendanceEntry[];
  referenceDate?: string;
};

export type StudentRetentionAssessment = {
  studentId: string;
  profileId: string;
  fullName: string;
  rankKey: string | null;
  trainingClassId: string | null;
  trainingClassName: string;
  whatsapp: string | null;
  guardianContact: string | null;
  photoDocumentId: string | null;
  consecutiveAbsences: number;
  lastPresentDate: string | null;
  daysSinceLastPresent: number | null;
  attended30d: number;
  total30d: number;
  rate30d: number;
  riskLevel: RetentionRiskLevel;
  riskReason: string;
};

export type RetentionCohortSummary = {
  totalActive: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  retentionRatePct: number;
  newEnrollmentsInMonth: number;
  cancellationsInMonth: number;
  netGrowthInMonth: number;
  riskBreakdown: Array<{ key: RetentionRiskLevel; label: string; count: number }>;
  byClass: Array<{
    classId: string;
    className: string;
    healthy: number;
    warning: number;
    critical: number;
  }>;
};

const RISK_PRIORITY: Record<RetentionRiskLevel, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
};

export function evaluateStudentRetention(
  input: EvaluateStudentRetentionInput
): StudentRetentionAssessment {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const sorted = [...input.attendanceEntries].sort((a, b) =>
    b.lessonDate.localeCompare(a.lessonDate)
  );

  let consecutiveAbsences = 0;
  for (const entry of sorted) {
    if (entry.status === "absent") {
      consecutiveAbsences += 1;
      continue;
    }
    // Presença ou falta abonada interrompe a sequência de evasão.
    break;
  }

  const lastPresentEntry = sorted.find((entry) => entry.status === "present");
  const lastPresentDate = lastPresentEntry ? lastPresentEntry.lessonDate.slice(0, 10) : null;
  const daysSinceLastPresent = lastPresentDate
    ? Math.max(0, daysBetweenIsoDates(lastPresentDate, referenceDay))
    : null;
  const daysEnrolled = Math.max(
    0,
    daysBetweenIsoDates(input.enrollmentCreatedAt.slice(0, 10), referenceDay)
  );

  const window30dEntries = sorted.filter(
    (entry) => daysBetweenIsoDates(entry.lessonDate.slice(0, 10), referenceDay) <= 30 &&
      daysBetweenIsoDates(entry.lessonDate.slice(0, 10), referenceDay) >= 0
  );
  const measurable30d = window30dEntries.filter((entry) => entry.status !== "excused");
  const attended30d = measurable30d.filter((entry) => entry.status === "present").length;
  const total30d = measurable30d.length;
  const rate30d = total30d > 0 ? Math.round((attended30d / total30d) * 100) : 100;

  let riskLevel: RetentionRiskLevel = "healthy";
  let riskReason = "Frequência regular";

  if (consecutiveAbsences >= 3) {
    riskLevel = "critical";
    riskReason = `${consecutiveAbsences} faltas seguidas`;
  } else if (daysSinceLastPresent !== null && daysSinceLastPresent >= 21) {
    riskLevel = "critical";
    riskReason = `${daysSinceLastPresent} dias sem treinar`;
  } else if (lastPresentDate === null && daysEnrolled >= 21 && sorted.length > 0) {
    riskLevel = "critical";
    riskReason = "Sem presença há mais de 21 dias";
  } else if (total30d >= 4 && rate30d < 50) {
    riskLevel = "critical";
    riskReason = `Frequência de ${rate30d}% nos últimos 30 dias`;
  } else if (consecutiveAbsences === 2) {
    riskLevel = "warning";
    riskReason = "2 faltas seguidas";
  } else if (daysSinceLastPresent !== null && daysSinceLastPresent >= 14) {
    riskLevel = "warning";
    riskReason = `${daysSinceLastPresent} dias sem treinar`;
  } else if (total30d >= 3 && rate30d < 75) {
    riskLevel = "warning";
    riskReason = `Frequência de ${rate30d}% nos últimos 30 dias`;
  }

  return {
    studentId: input.studentId,
    profileId: input.profileId,
    fullName: input.fullName,
    rankKey: input.rankKey ?? null,
    trainingClassId: input.trainingClassId ?? null,
    trainingClassName: input.trainingClassName?.trim() || "Sem turma vinculada",
    whatsapp: input.whatsapp ?? null,
    guardianContact: input.guardianContact ?? null,
    photoDocumentId: input.photoDocumentId ?? null,
    consecutiveAbsences,
    lastPresentDate,
    daysSinceLastPresent,
    attended30d,
    total30d,
    rate30d,
    riskLevel,
    riskReason,
  };
}

export function sortRetentionAssessments(
  rows: StudentRetentionAssessment[]
): StudentRetentionAssessment[] {
  return [...rows].sort((a, b) => {
    const priorityDiff = RISK_PRIORITY[a.riskLevel] - RISK_PRIORITY[b.riskLevel];
    if (priorityDiff !== 0) return priorityDiff;
    if (b.consecutiveAbsences !== a.consecutiveAbsences) {
      return b.consecutiveAbsences - a.consecutiveAbsences;
    }
    const daysA = a.daysSinceLastPresent ?? -1;
    const daysB = b.daysSinceLastPresent ?? -1;
    if (daysB !== daysA) return daysB - daysA;
    return a.fullName.localeCompare(b.fullName, "pt-BR");
  });
}

export function summarizeRetentionCohort(
  rows: StudentRetentionAssessment[],
  newEnrollmentsInMonth: number,
  cancellationsInMonth: number
): RetentionCohortSummary {
  const totalActive = rows.length;
  const criticalCount = rows.filter((row) => row.riskLevel === "critical").length;
  const warningCount = rows.filter((row) => row.riskLevel === "warning").length;
  const healthyCount = rows.filter((row) => row.riskLevel === "healthy").length;
  const retentionRatePct =
    totalActive > 0 ? Math.round(((healthyCount + warningCount) / totalActive) * 100) : 100;

  const classMap = new Map<
    string,
    { classId: string; className: string; healthy: number; warning: number; critical: number }
  >();
  for (const row of rows) {
    const key = row.trainingClassId ?? "unassigned";
    const bucket = classMap.get(key) ?? {
      classId: key,
      className: row.trainingClassName,
      healthy: 0,
      warning: 0,
      critical: 0,
    };
    bucket[row.riskLevel] += 1;
    classMap.set(key, bucket);
  }

  return {
    totalActive,
    criticalCount,
    warningCount,
    healthyCount,
    retentionRatePct,
    newEnrollmentsInMonth,
    cancellationsInMonth,
    netGrowthInMonth: newEnrollmentsInMonth - cancellationsInMonth,
    riskBreakdown: [
      { key: "healthy", label: "Frequência regular", count: healthyCount },
      { key: "warning", label: "Em atenção", count: warningCount },
      { key: "critical", label: "Risco crítico", count: criticalCount },
    ],
    byClass: [...classMap.values()].sort(
      (a, b) => b.critical + b.warning - (a.critical + a.warning)
    ),
  };
}
