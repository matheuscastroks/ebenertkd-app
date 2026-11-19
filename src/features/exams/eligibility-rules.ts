import { findRank, nextEnabledRank, rankRequirement, type RankConfig } from "@/features/academy/belt-rules";
import { DEFAULT_EXAM_POLICY, type ExamPolicy } from "@/features/academy/defaults";
import { rankEntry, type RankKey } from "@/features/academy/ranks";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type ExamEligibilityStatus =
  | "eligible"
  | "financial_hold"
  | "almost_ready"
  | "in_progress"
  | "already_registered"
  | "black_belt";

/** Configuração de graduações e política de exame que a regra recebe por parâmetro (nada fixo no código). */
export type EligibilityContext = {
  ranks: readonly RankConfig[];
  exam: Pick<ExamPolicy, "block_on_overdue" | "almost_ready_pct" | "fallback_min_days" | "fallback_min_presences">;
};

export type EvaluateExamEligibilityInput = {
  studentId: string;
  fullName: string;
  /** Graduação atual (`rank_key`). Sem ela o aluno fica "em andamento", sem alvo. */
  currentRankKey?: string | null;
  trainingClassId?: string | null;
  trainingClassName?: string | null;
  photoDocumentId?: string | null;
  beltStartDate?: string | null;
  birthDate?: string | null;
  presencesSinceLastBelt: number;
  hasOverdueCharges: boolean;
  registeredEventId?: string | null;
  registeredEventName?: string | null;
  referenceDate?: string;
};

export type StudentEligibilityAssessment = {
  studentId: string;
  fullName: string;
  currentRankKey: RankKey | null;
  targetRankKey: RankKey | null;
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
  /** Idade mínima para prestar exame para a graduação alvo; `null` quando não há. */
  minAgeRequired: number | null;
  /** Idade conhecida e abaixo do mínimo da graduação alvo. */
  ageBlocked: boolean;
  timeProgressPct: number;
  presenceProgressPct: number;
  overallProgressPct: number;
  /** Cumpre tempo, presenças e idade (independe de pendência financeira e de já estar inscrito). */
  meetsRequirements: boolean;
  /** Pode prestar exame hoje: cumpre os requisitos e a pendência financeira não bloqueia. Base do aviso de impacto. */
  canTakeExam: boolean;
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
  byRank: Array<{
    rankKey: RankKey;
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

/** Idade completa em anos na data de referência; `null` sem data de nascimento válida. */
export function ageInYears(birthDate: string | null | undefined, referenceDay: string): number | null {
  const birth = birthDate?.slice(0, 10);
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ry, rm, rd] = referenceDay.split("-").map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age >= 0 ? age : null;
}

export const DEFAULT_ELIGIBILITY_EXAM: EligibilityContext["exam"] = {
  block_on_overdue: DEFAULT_EXAM_POLICY.block_on_overdue,
  almost_ready_pct: DEFAULT_EXAM_POLICY.almost_ready_pct,
  fallback_min_days: DEFAULT_EXAM_POLICY.fallback_min_days,
  fallback_min_presences: DEFAULT_EXAM_POLICY.fallback_min_presences,
};

export function evaluateExamEligibility(
  input: EvaluateExamEligibilityInput,
  context: EligibilityContext
): StudentEligibilityAssessment {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const current = findRank(context.ranks, input.currentRankKey);
  const next = current ? nextEnabledRank(context.ranks, current.rank_key) : null;
  const requirement = rankRequirement(current, context.exam);

  const beltStart = input.beltStartDate ? input.beltStartDate.slice(0, 10) : null;
  const daysInCurrentBelt = beltStart ? Math.max(0, daysBetweenIsoDates(beltStart, referenceDay)) : 0;
  const monthsInCurrentBelt = Number((daysInCurrentBelt / 30).toFixed(1));

  const common = {
    studentId: input.studentId,
    fullName: input.fullName,
    currentRankKey: current?.rank_key ?? null,
    trainingClassId: input.trainingClassId ?? null,
    trainingClassName: input.trainingClassName?.trim() || "Sem turma vinculada",
    photoDocumentId: input.photoDocumentId ?? null,
    beltStartDate: beltStart,
    daysInCurrentBelt,
    monthsInCurrentBelt,
    presencesSinceLastBelt: input.presencesSinceLastBelt,
    hasOverdueCharges: input.hasOverdueCharges,
    registeredEventId: input.registeredEventId ?? null,
    registeredEventName: input.registeredEventName ?? null,
  };

  // Sem graduação conhecida: em andamento. Última graduação, ou Poom/Dan sem tempo configurado: sem avaliação automática.
  if (!current || !next || !requirement.evaluated) {
    return {
      ...common,
      targetRankKey: null,
      minDaysRequired: 0,
      minMonthsRequired: 0,
      minPresencesRequired: 0,
      minAgeRequired: null,
      ageBlocked: false,
      timeProgressPct: 100,
      presenceProgressPct: 100,
      overallProgressPct: 100,
      meetsRequirements: false,
      canTakeExam: false,
      status: current ? "black_belt" : "in_progress",
    };
  }

  const percent = (done: number, needed: number) => (needed <= 0 ? 100 : Math.min(100, Math.round((done / needed) * 100)));
  const timeProgressPct = percent(daysInCurrentBelt, requirement.minDays);
  const presenceProgressPct = percent(input.presencesSinceLastBelt, requirement.minPresences);
  const overallProgressPct = Math.min(timeProgressPct, presenceProgressPct);

  const minAgeRequired = next.min_age_years ?? null;
  const age = ageInYears(input.birthDate, referenceDay);
  const ageBlocked = minAgeRequired != null && age != null && age < minAgeRequired;

  const meetsRequirements =
    daysInCurrentBelt >= requirement.minDays && input.presencesSinceLastBelt >= requirement.minPresences && !ageBlocked;
  const financiallyBlocked = context.exam.block_on_overdue && input.hasOverdueCharges;

  let status: ExamEligibilityStatus = "in_progress";
  if (input.registeredEventId) {
    status = "already_registered";
  } else if (meetsRequirements && financiallyBlocked) {
    status = "financial_hold";
  } else if (meetsRequirements) {
    status = "eligible";
  } else if (!ageBlocked && overallProgressPct >= context.exam.almost_ready_pct) {
    status = "almost_ready";
  }

  return {
    ...common,
    targetRankKey: next.rank_key,
    minDaysRequired: requirement.minDays,
    minMonthsRequired: Math.round(requirement.minDays / 30),
    minPresencesRequired: requirement.minPresences,
    minAgeRequired,
    ageBlocked,
    timeProgressPct,
    presenceProgressPct,
    overallProgressPct,
    meetsRequirements,
    canTakeExam: meetsRequirements && !financiallyBlocked,
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
  const buckets = new Map<RankKey, { rankKey: RankKey; eligible: number; almostReady: number; inProgress: number }>();

  for (const row of rows) {
    if (!row.currentRankKey || row.status === "black_belt") continue;
    const bucket = buckets.get(row.currentRankKey) ?? { rankKey: row.currentRankKey, eligible: 0, almostReady: 0, inProgress: 0 };
    if (row.status === "eligible" || row.status === "already_registered") {
      bucket.eligible += 1;
    } else if (row.status === "almost_ready" || row.status === "financial_hold") {
      bucket.almostReady += 1;
    } else {
      bucket.inProgress += 1;
    }
    buckets.set(row.currentRankKey, bucket);
  }

  return {
    totalActive: rows.length,
    eligibleCount: rows.filter((row) => row.status === "eligible").length,
    almostReadyCount: rows.filter((row) => row.status === "almost_ready").length,
    financialHoldCount: rows.filter((row) => row.status === "financial_hold").length,
    alreadyRegisteredCount: rows.filter((row) => row.status === "already_registered").length,
    inProgressCount: rows.filter((row) => row.status === "in_progress").length,
    // Do mais novo (10º gub) ao mais avançado.
    byRank: [...buckets.values()].sort((a, b) => rankEntry(a.rankKey).order - rankEntry(b.rankKey).order),
  };
}
