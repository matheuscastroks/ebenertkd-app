import { getNextGraduation, gubForBelt, type BeltOption, type GubOption } from "@/features/students/options";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type ExamEligibilityStatus =
  | "eligible"
  | "financial_hold"
  | "almost_ready"
  | "in_progress"
  | "already_registered"
  | "black_belt";

export type GubEligibilityRequirement = {
  minMonths: number;
  minDays: number;
  minPresences: number;
};

export const GUB_ELIGIBILITY_REQUIREMENTS: Record<number, GubEligibilityRequirement> = {
  10: { minMonths: 3, minDays: 90, minPresences: 20 },
  9: { minMonths: 3, minDays: 90, minPresences: 20 },
  8: { minMonths: 3, minDays: 90, minPresences: 24 },
  7: { minMonths: 3, minDays: 90, minPresences: 24 },
  6: { minMonths: 4, minDays: 120, minPresences: 30 },
  5: { minMonths: 4, minDays: 120, minPresences: 30 },
  4: { minMonths: 5, minDays: 150, minPresences: 36 },
  3: { minMonths: 5, minDays: 150, minPresences: 36 },
  2: { minMonths: 6, minDays: 180, minPresences: 48 },
  1: { minMonths: 6, minDays: 180, minPresences: 48 },
};

export type EvaluateExamEligibilityInput = {
  studentId: string;
  fullName: string;
  currentBelt?: string | null;
  currentGub?: number | null;
  trainingClassId?: string | null;
  trainingClassName?: string | null;
  photoDocumentId?: string | null;
  beltStartDate?: string | null;
  presencesSinceLastBelt: number;
  hasOverdueCharges: boolean;
  registeredEventId?: string | null;
  registeredEventName?: string | null;
  referenceDate?: string;
};

export type StudentEligibilityAssessment = {
  studentId: string;
  fullName: string;
  currentBelt: string | null;
  currentGub: number | null;
  targetBelt: BeltOption | null;
  targetGub: GubOption | null;
  trainingClassId: string | null;
  trainingClassName: string;
  photoDocumentId: string | null;
  beltStartDate: string | null;
  daysInCurrentBelt: number;
  monthsInCurrentBelt: number;
  minDaysRequired: number;
  minMonthsRequired: number;
  presencesSinceLastBelt: number;
  minPresencesRequired: number;
  timeProgressPct: number;
  presenceProgressPct: number;
  overallProgressPct: number;
  hasOverdueCharges: boolean;
  registeredEventId: string | null;
  registeredEventName: string | null;
  status: ExamEligibilityStatus;
};

export type EligibilitySummary = {
  totalActive: number;
  eligibleCount: number;
  almostReadyCount: number;
  financialHoldCount: number;
  alreadyRegisteredCount: number;
  inProgressCount: number;
  byBelt: Array<{
    gub: number;
    belt: string;
    eligible: number;
    almostReady: number;
    inProgress: number;
  }>;
};

const STATUS_PRIORITY: Record<ExamEligibilityStatus, number> = {
  eligible: 0,
  financial_hold: 1,
  almost_ready: 2,
  already_registered: 3,
  in_progress: 4,
  black_belt: 5,
};

export function evaluateExamEligibility(
  input: EvaluateExamEligibilityInput
): StudentEligibilityAssessment {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const resolvedGub =
    input.currentGub ?? (input.currentBelt ? (gubForBelt(input.currentBelt) ?? null) : null);
  const next = getNextGraduation(resolvedGub);

  const beltStart = input.beltStartDate ? input.beltStartDate.slice(0, 10) : null;
  const daysInCurrentBelt = beltStart
    ? Math.max(0, daysBetweenIsoDates(beltStart, referenceDay))
    : 0;
  const monthsInCurrentBelt = Number((daysInCurrentBelt / 30).toFixed(1));

  if (resolvedGub === 0 || !next || resolvedGub == null) {
    return {
      studentId: input.studentId,
      fullName: input.fullName,
      currentBelt: input.currentBelt ?? null,
      currentGub: resolvedGub,
      targetBelt: null,
      targetGub: null,
      trainingClassId: input.trainingClassId ?? null,
      trainingClassName: input.trainingClassName?.trim() || "Sem turma vinculada",
      photoDocumentId: input.photoDocumentId ?? null,
      beltStartDate: beltStart,
      daysInCurrentBelt,
      monthsInCurrentBelt,
      minDaysRequired: 0,
      minMonthsRequired: 0,
      presencesSinceLastBelt: input.presencesSinceLastBelt,
      minPresencesRequired: 0,
      timeProgressPct: 100,
      presenceProgressPct: 100,
      overallProgressPct: 100,
      hasOverdueCharges: input.hasOverdueCharges,
      registeredEventId: input.registeredEventId ?? null,
      registeredEventName: input.registeredEventName ?? null,
      status: resolvedGub === 0 ? "black_belt" : "in_progress",
    };
  }

  const req = GUB_ELIGIBILITY_REQUIREMENTS[resolvedGub] ?? {
    minMonths: 3,
    minDays: 90,
    minPresences: 24,
  };

  const timeProgressPct = Math.min(100, Math.round((daysInCurrentBelt / req.minDays) * 100));
  const presenceProgressPct = Math.min(
    100,
    Math.round((input.presencesSinceLastBelt / req.minPresences) * 100)
  );
  const overallProgressPct = Math.min(timeProgressPct, presenceProgressPct);

  const meetsPedagogical =
    daysInCurrentBelt >= req.minDays && input.presencesSinceLastBelt >= req.minPresences;

  let status: ExamEligibilityStatus = "in_progress";
  if (input.registeredEventId) {
    status = "already_registered";
  } else if (meetsPedagogical && input.hasOverdueCharges) {
    status = "financial_hold";
  } else if (meetsPedagogical) {
    status = "eligible";
  } else if (overallProgressPct >= 75) {
    status = "almost_ready";
  }

  return {
    studentId: input.studentId,
    fullName: input.fullName,
    currentBelt: input.currentBelt ?? null,
    currentGub: resolvedGub,
    targetBelt: next.targetBelt,
    targetGub: next.targetGub,
    trainingClassId: input.trainingClassId ?? null,
    trainingClassName: input.trainingClassName?.trim() || "Sem turma vinculada",
    photoDocumentId: input.photoDocumentId ?? null,
    beltStartDate: beltStart,
    daysInCurrentBelt,
    monthsInCurrentBelt,
    minDaysRequired: req.minDays,
    minMonthsRequired: req.minMonths,
    presencesSinceLastBelt: input.presencesSinceLastBelt,
    minPresencesRequired: req.minPresences,
    timeProgressPct,
    presenceProgressPct,
    overallProgressPct,
    hasOverdueCharges: input.hasOverdueCharges,
    registeredEventId: input.registeredEventId ?? null,
    registeredEventName: input.registeredEventName ?? null,
    status,
  };
}

export function sortEligibilityAssessments(
  rows: StudentEligibilityAssessment[]
): StudentEligibilityAssessment[] {
  return [...rows].sort((a, b) => {
    const diff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (diff !== 0) return diff;
    if (b.overallProgressPct !== a.overallProgressPct) {
      return b.overallProgressPct - a.overallProgressPct;
    }
    return a.fullName.localeCompare(b.fullName, "pt-BR");
  });
}

export function summarizeEligibility(rows: StudentEligibilityAssessment[]): EligibilitySummary {
  const beltBuckets = new Map<
    number,
    { gub: number; belt: string; eligible: number; almostReady: number; inProgress: number }
  >();

  for (const row of rows) {
    if (row.currentGub == null || row.currentGub <= 0) continue;
    const bucket = beltBuckets.get(row.currentGub) ?? {
      gub: row.currentGub,
      belt: row.currentBelt ?? `${row.currentGub}º Gub`,
      eligible: 0,
      almostReady: 0,
      inProgress: 0,
    };
    if (row.status === "eligible" || row.status === "already_registered") {
      bucket.eligible += 1;
    } else if (row.status === "almost_ready" || row.status === "financial_hold") {
      bucket.almostReady += 1;
    } else {
      bucket.inProgress += 1;
    }
    beltBuckets.set(row.currentGub, bucket);
  }

  return {
    totalActive: rows.length,
    eligibleCount: rows.filter((row) => row.status === "eligible").length,
    almostReadyCount: rows.filter((row) => row.status === "almost_ready").length,
    financialHoldCount: rows.filter((row) => row.status === "financial_hold").length,
    alreadyRegisteredCount: rows.filter((row) => row.status === "already_registered").length,
    inProgressCount: rows.filter((row) => row.status === "in_progress").length,
    byBelt: [...beltBuckets.values()].sort((a, b) => b.gub - a.gub),
  };
}
