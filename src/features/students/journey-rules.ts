import { DEFAULT_STUDENT_RANK, findRank, nextEnabledRank, rankRequirement, type PublicRank } from "@/features/academy/belt-rules";
import { isRankKey, rankOrder, type RankKey } from "@/features/academy/ranks";
import { ageInYears, type EligibilityContext } from "@/features/exams/eligibility-rules";
import type { BeltHistory } from "@/features/exams/types";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type BeltRoadmapState = "achieved" | "current" | "next" | "upcoming";

export type BeltRoadmapStep = {
  rankKey: RankKey;
  /** Poomsae/Tul exigido nesta graduação (configurado). */
  formName: string | null;
  state: BeltRoadmapState;
  achievedAt: string | null;
  /** Nome da faixa no dia da conquista (snapshot do histórico), quando houve. */
  achievedName: string | null;
};

export type StudentPedagogicalReadiness = {
  currentRankKey: RankKey;
  currentForm: string | null;
  targetRankKey: RankKey | null;
  nextForm: string | null;
  beltStartDate: string | null;
  daysInCurrentBelt: number;
  monthsInCurrentBelt: number;
  minDaysRequired: number;
  minMonthsRequired: number;
  remainingDays: number;
  presencesSinceLastBelt: number;
  minPresencesRequired: number;
  remainingPresences: number;
  minAgeRequired: number | null;
  ageBlocked: boolean;
  timeProgressPct: number;
  presenceProgressPct: number;
  overallProgressPct: number;
  isPedagogicallyReady: boolean;
  /** Sem próxima graduação a avaliar (última do sistema, ou faixa preta sem tempos configurados). */
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

/** Sem graduação informada o aluno é tratado como iniciante (primeira graduação do catálogo). */
export function resolveStudentRank(rankKey?: string | null): RankKey {
  return isRankKey(rankKey) ? rankKey : DEFAULT_STUDENT_RANK;
}

/**
 * Caminho do aluno: as graduações habilitadas (e a atual, mesmo desativada) na ordem de progressão.
 * O estado vem da posição da graduação atual; a data da conquista, do histórico.
 */
export function buildBeltRoadmap(input: {
  currentRankKey?: string | null;
  beltHistory: Array<Pick<BeltHistory, "new_rank_key" | "new_belt_name" | "achieved_at">>;
  ranks: readonly PublicRank[];
}): BeltRoadmapStep[] {
  const active = resolveStudentRank(input.currentRankKey);
  const activeOrder = rankOrder(active);
  const achieved = new Map<string, { at: string; name: string }>();
  for (const row of input.beltHistory) {
    const existing = achieved.get(row.new_rank_key);
    if (!existing || row.achieved_at.slice(0, 10) > existing.at) {
      achieved.set(row.new_rank_key, { at: row.achieved_at.slice(0, 10), name: row.new_belt_name });
    }
  }
  const next = nextEnabledRank(input.ranks, active);

  return input.ranks
    .filter((rank) => rank.enabled || rank.rank_key === active)
    .map((rank) => {
      const order = rankOrder(rank.rank_key);
      let state: BeltRoadmapState = "upcoming";
      if (rank.rank_key === active) state = "current";
      else if (order < activeOrder) state = "achieved";
      else if (next && rank.rank_key === next.rank_key) state = "next";
      const done = achieved.get(rank.rank_key);
      return { rankKey: rank.rank_key, formName: rank.form_name, state, achievedAt: done?.at ?? null, achievedName: done?.name ?? null };
    });
}

export function buildStudentReadiness(
  input: {
    currentRankKey?: string | null;
    beltStartDate?: string | null;
    birthDate?: string | null;
    presencesSinceLastBelt: number;
    referenceDate?: string;
  },
  context: EligibilityContext
): StudentPedagogicalReadiness {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const activeKey = resolveStudentRank(input.currentRankKey);
  const current = findRank(context.ranks, activeKey);
  const beltStart = input.beltStartDate ? input.beltStartDate.slice(0, 10) : null;
  const daysInCurrentBelt = beltStart ? Math.max(0, daysBetweenIsoDates(beltStart, referenceDay)) : 0;
  const monthsInCurrentBelt = Number((daysInCurrentBelt / 30).toFixed(1));
  const next = nextEnabledRank(context.ranks, activeKey);
  const requirement = rankRequirement(current, context.exam);

  const common = {
    currentRankKey: activeKey,
    currentForm: current?.form_name ?? null,
    beltStartDate: beltStart,
    daysInCurrentBelt,
    monthsInCurrentBelt,
    presencesSinceLastBelt: input.presencesSinceLastBelt,
  };

  if (!next || !requirement.evaluated) {
    return {
      ...common,
      targetRankKey: null,
      nextForm: null,
      minDaysRequired: 0,
      minMonthsRequired: 0,
      remainingDays: 0,
      minPresencesRequired: 0,
      remainingPresences: 0,
      minAgeRequired: null,
      ageBlocked: false,
      timeProgressPct: 100,
      presenceProgressPct: 100,
      overallProgressPct: 100,
      isPedagogicallyReady: true,
      isBlackBelt: true,
    };
  }

  const percent = (done: number, needed: number) => (needed <= 0 ? 100 : Math.min(100, Math.round((done / needed) * 100)));
  const timeProgressPct = percent(daysInCurrentBelt, requirement.minDays);
  const presenceProgressPct = percent(input.presencesSinceLastBelt, requirement.minPresences);
  const minAgeRequired = next.min_age_years ?? null;
  const age = ageInYears(input.birthDate, referenceDay);
  const ageBlocked = minAgeRequired != null && age != null && age < minAgeRequired;

  return {
    ...common,
    targetRankKey: next.rank_key,
    nextForm: next.form_name,
    minDaysRequired: requirement.minDays,
    minMonthsRequired: Math.round(requirement.minDays / 30),
    remainingDays: Math.max(0, requirement.minDays - daysInCurrentBelt),
    minPresencesRequired: requirement.minPresences,
    remainingPresences: Math.max(0, requirement.minPresences - input.presencesSinceLastBelt),
    minAgeRequired,
    ageBlocked,
    timeProgressPct,
    presenceProgressPct,
    overallProgressPct: Math.min(timeProgressPct, presenceProgressPct),
    isPedagogicallyReady:
      daysInCurrentBelt >= requirement.minDays && input.presencesSinceLastBelt >= requirement.minPresences && !ageBlocked,
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
