import { GUB_ELIGIBILITY_REQUIREMENTS } from "@/features/exams/eligibility-rules";
import type { BeltHistory } from "@/features/exams/types";
import {
  GUB_BELT_OPTIONS,
  getNextGraduation,
  gubForBelt,
  poomsaeForGub,
  type BeltOption,
  type GubOption,
} from "@/features/students/options";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type BeltRoadmapState = "achieved" | "current" | "next" | "upcoming";

export type BeltRoadmapStep = {
  gub: number;
  belt: string;
  poomsae: string;
  state: BeltRoadmapState;
  achievedAt: string | null;
};

export type StudentPedagogicalReadiness = {
  currentGub: number;
  currentBelt: string;
  currentPoomsae: string;
  targetGub: GubOption | null;
  targetBelt: BeltOption | null;
  nextPoomsae: string | null;
  beltStartDate: string | null;
  daysInCurrentBelt: number;
  monthsInCurrentBelt: number;
  minDaysRequired: number;
  minMonthsRequired: number;
  remainingDays: number;
  presencesSinceLastBelt: number;
  minPresencesRequired: number;
  remainingPresences: number;
  timeProgressPct: number;
  presenceProgressPct: number;
  overallProgressPct: number;
  isPedagogicallyReady: boolean;
  isBlackBelt: boolean;
};

export type StudentMonthlyAttendancePoint = {
  competence: string;
  label: string;
  present: number;
  absent: number;
  excused: number;
};

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

export function resolveStudentGub(currentGub?: number | null, currentBelt?: string | null): number {
  if (currentGub != null) return currentGub;
  if (currentBelt) {
    const inferred = gubForBelt(currentBelt);
    if (inferred != null) return inferred;
  }
  return 10;
}

export function buildBeltRoadmap(input: {
  currentGub?: number | null;
  currentBelt?: string | null;
  beltHistory: BeltHistory[];
}): BeltRoadmapStep[] {
  const activeGub = resolveStudentGub(input.currentGub, input.currentBelt);
  const achievedByGub = new Map<number, string>();
  for (const row of input.beltHistory) {
    const existing = achievedByGub.get(row.new_gub);
    if (!existing || row.achieved_at > existing) {
      achievedByGub.set(row.new_gub, row.achieved_at.slice(0, 10));
    }
  }

  const allSteps: Array<{ gub: number; belt: string; poomsae: string }> = [
    ...GUB_BELT_OPTIONS.map((item) => ({
      gub: item.gub,
      belt: item.belt,
      poomsae: item.poomsae,
    })),
    { gub: 0, belt: "Preta", poomsae: "Koryo" },
  ];

  return allSteps.map((step) => {
    let state: BeltRoadmapState = "upcoming";
    if (step.gub === activeGub) {
      state = "current";
    } else if (step.gub > activeGub) {
      state = "achieved";
    } else if (activeGub > 0 && step.gub === activeGub - 1) {
      state = "next";
    }
    return {
      ...step,
      state,
      achievedAt: achievedByGub.get(step.gub) ?? null,
    };
  });
}

export function buildStudentReadiness(input: {
  currentGub?: number | null;
  currentBelt?: string | null;
  beltStartDate?: string | null;
  presencesSinceLastBelt: number;
  referenceDate?: string;
}): StudentPedagogicalReadiness {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const activeGub = resolveStudentGub(input.currentGub, input.currentBelt);
  const currentBelt =
    input.currentBelt?.trim() ||
    GUB_BELT_OPTIONS.find((item) => item.gub === activeGub)?.belt ||
    (activeGub === 0 ? "Preta" : "Branca");
  const currentPoomsae = poomsaeForGub(activeGub, currentBelt);
  const beltStart = input.beltStartDate ? input.beltStartDate.slice(0, 10) : null;
  const daysInCurrentBelt = beltStart
    ? Math.max(0, daysBetweenIsoDates(beltStart, referenceDay))
    : 0;
  const monthsInCurrentBelt = Number((daysInCurrentBelt / 30).toFixed(1));

  const next = getNextGraduation(activeGub);
  if (activeGub === 0 || !next) {
    return {
      currentGub: activeGub,
      currentBelt,
      currentPoomsae,
      targetGub: null,
      targetBelt: null,
      nextPoomsae: null,
      beltStartDate: beltStart,
      daysInCurrentBelt,
      monthsInCurrentBelt,
      minDaysRequired: 0,
      minMonthsRequired: 0,
      remainingDays: 0,
      presencesSinceLastBelt: input.presencesSinceLastBelt,
      minPresencesRequired: 0,
      remainingPresences: 0,
      timeProgressPct: 100,
      presenceProgressPct: 100,
      overallProgressPct: 100,
      isPedagogicallyReady: true,
      isBlackBelt: true,
    };
  }

  const req = GUB_ELIGIBILITY_REQUIREMENTS[activeGub] ?? {
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

  return {
    currentGub: activeGub,
    currentBelt,
    currentPoomsae,
    targetGub: next.targetGub,
    targetBelt: next.targetBelt,
    nextPoomsae: poomsaeForGub(next.targetGub, next.targetBelt),
    beltStartDate: beltStart,
    daysInCurrentBelt,
    monthsInCurrentBelt,
    minDaysRequired: req.minDays,
    minMonthsRequired: req.minMonths,
    remainingDays: Math.max(0, req.minDays - daysInCurrentBelt),
    presencesSinceLastBelt: input.presencesSinceLastBelt,
    minPresencesRequired: req.minPresences,
    remainingPresences: Math.max(0, req.minPresences - input.presencesSinceLastBelt),
    timeProgressPct,
    presenceProgressPct,
    overallProgressPct,
    isPedagogicallyReady:
      daysInCurrentBelt >= req.minDays && input.presencesSinceLastBelt >= req.minPresences,
    isBlackBelt: false,
  };
}

export function buildMonthlyAttendanceSeries(
  entries: Array<{ lessonDate: string; status: "present" | "absent" | "excused" }>,
  monthsCount = 6,
  referenceDate?: string
): StudentMonthlyAttendancePoint[] {
  const ref = (referenceDate ?? saoPauloToday()).slice(0, 7);
  const [refYear, refMonth] = ref.split("-").map(Number);

  return Array.from({ length: monthsCount }, (_, index) => {
    const shifted = new Date(Date.UTC(refYear, refMonth - 1 - (monthsCount - 1 - index), 1));
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const competence = `${year}-${String(month).padStart(2, "0")}`;
    const label = `${MONTHS_SHORT[month - 1]}/${String(year).slice(-2)}`;
    const matched = entries.filter((entry) => entry.lessonDate.startsWith(competence));
    return {
      competence,
      label,
      present: matched.filter((entry) => entry.status === "present").length,
      absent: matched.filter((entry) => entry.status === "absent").length,
      excused: matched.filter((entry) => entry.status === "excused").length,
    };
  });
}
