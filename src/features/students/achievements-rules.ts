import { DEFAULT_BADGES, type BadgeDefinition } from "@/features/academy/defaults";
import type { BeltHistory } from "@/features/exams/types";
import { daysBetweenIsoDates, saoPauloToday } from "@/lib/dates";

export type AchievementEntry = {
  lessonDate: string;
  status: "present" | "absent" | "excused";
};

export type StudentBadge = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  currentValue: number;
  targetValue: number;
  progressPct: number;
};

export type HeatmapDayCell = {
  date: string;
  status: "none" | "present" | "excused";
  count: number;
};

export type StudentConsistencyReport = {
  totalPresences: number;
  currentWeekStreak: number;
  bestWeekStreak: number;
  perfectMonthsCount: number;
  graduationsCount: number;
  tenureMonths: number;
  unlockedCount: number;
  badges: StudentBadge[];
  heatmapWeeks: HeatmapDayCell[][];
};

function startOfIsoWeekUtc(isoDay: string): string {
  const ms = Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(ms)) return isoDay.slice(0, 10);
  const date = new Date(ms);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(isoDay: string, delta: number): string {
  const ms = Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`);
  return new Date(ms + delta * 86400000).toISOString().slice(0, 10);
}

function makeBadge(
  id: string,
  title: string,
  description: string,
  currentValue: number,
  targetValue: number
): StudentBadge {
  const clamped = Math.max(0, currentValue);
  const progressPct = Math.min(100, Math.round((clamped / targetValue) * 100));
  return {
    id,
    title,
    description,
    unlocked: clamped >= targetValue,
    currentValue: clamped,
    targetValue,
    progressPct,
  };
}

export function buildStudentConsistencyReport(input: {
  entries: AchievementEntry[];
  beltHistory: BeltHistory[];
  startedAt?: string | null;
  referenceDate?: string;
  /** Conquistas da academia (padrão = as 8 originais). A métrica de cada uma é fixa; título, descrição e meta são editáveis. */
  badges?: readonly BadgeDefinition[];
}): StudentConsistencyReport {
  const referenceDay = (input.referenceDate ?? saoPauloToday()).slice(0, 10);
  const presentEntries = input.entries.filter((e) => e.status === "present");
  const totalPresences = presentEntries.length;

  // Semanas com presença ou falta abonada (doença/justificativa não pune sequência).
  const activeWeekStarts = new Set<string>();
  const presentWeekStarts = new Set<string>();
  for (const entry of input.entries) {
    if (entry.status === "present") {
      const wk = startOfIsoWeekUtc(entry.lessonDate);
      activeWeekStarts.add(wk);
      presentWeekStarts.add(wk);
    } else if (entry.status === "excused") {
      activeWeekStarts.add(startOfIsoWeekUtc(entry.lessonDate));
    }
  }

  const sortedWeeks = [...activeWeekStarts].sort();
  let bestWeekStreak = 0;
  let running = 0;
  let prevWeek: string | null = null;
  for (const wk of sortedWeeks) {
    if (prevWeek && daysBetweenIsoDates(prevWeek, wk) === 7) {
      running += 1;
    } else {
      running = 1;
    }
    if (running > bestWeekStreak) bestWeekStreak = running;
    prevWeek = wk;
  }

  // Sequência atual: começa na semana atual (ou anterior caso a semana atual ainda não tenha tido aula).
  const thisWeek = startOfIsoWeekUtc(referenceDay);
  const prevCalendarWeek = addDaysUtc(thisWeek, -7);
  let cursorWeek = activeWeekStarts.has(thisWeek)
    ? thisWeek
    : activeWeekStarts.has(prevCalendarWeek)
      ? prevCalendarWeek
      : null;

  let currentWeekStreak = 0;
  while (cursorWeek && activeWeekStarts.has(cursorWeek)) {
    currentWeekStreak += 1;
    cursorWeek = addDaysUtc(cursorWeek, -7);
  }
  if (presentWeekStarts.size === 0) {
    currentWeekStreak = 0;
    bestWeekStreak = 0;
  }

  // Meses perfeitos (>= 4 aulas registradas e 0 faltas sem justificativa).
  const byMonth = new Map<string, AchievementEntry[]>();
  for (const entry of input.entries) {
    const month = entry.lessonDate.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push(entry);
    byMonth.set(month, list);
  }
  let perfectMonthsCount = 0;
  for (const monthEntries of byMonth.values()) {
    const presents = monthEntries.filter((e) => e.status === "present").length;
    const unexcused = monthEntries.filter((e) => e.status === "absent").length;
    if (presents >= 4 && unexcused === 0) {
      perfectMonthsCount += 1;
    }
  }

  const graduationsCount = input.beltHistory.length;
  const tenureMonths = input.startedAt
    ? Math.max(0, Math.floor(daysBetweenIsoDates(input.startedAt.slice(0, 10), referenceDay) / 30))
    : 0;

  const metricValues: Record<BadgeDefinition["metric"], number> = {
    total_presences: totalPresences,
    best_week_streak: bestWeekStreak,
    perfect_months: perfectMonthsCount,
    graduations: graduationsCount,
    tenure_months: tenureMonths,
  };
  const badges: StudentBadge[] = (input.badges ?? DEFAULT_BADGES).map((badge) =>
    makeBadge(badge.id, badge.title, badge.description, metricValues[badge.metric], badge.target)
  );

  // Heatmap das últimas 20 semanas (segunda a domingo).
  const dayStatusMap = new Map<string, { status: "present" | "excused"; count: number }>();
  for (const entry of input.entries) {
    if (entry.status === "absent") continue;
    const day = entry.lessonDate.slice(0, 10);
    const prev = dayStatusMap.get(day);
    if (!prev) {
      dayStatusMap.set(day, { status: entry.status, count: 1 });
    } else {
      dayStatusMap.set(day, {
        status: prev.status === "present" || entry.status === "present" ? "present" : "excused",
        count: prev.count + 1,
      });
    }
  }

  const firstWeekStart = addDaysUtc(thisWeek, -19 * 7);
  const heatmapWeeks: HeatmapDayCell[][] = Array.from({ length: 20 }, (_, weekIdx) => {
    const wkStart = addDaysUtc(firstWeekStart, weekIdx * 7);
    return Array.from({ length: 7 }, (_, dayIdx) => {
      const date = addDaysUtc(wkStart, dayIdx);
      const hit = dayStatusMap.get(date);
      return {
        date,
        status: hit ? hit.status : "none",
        count: hit ? hit.count : 0,
      };
    });
  });

  return {
    totalPresences,
    currentWeekStreak,
    bestWeekStreak,
    perfectMonthsCount,
    graduationsCount,
    tenureMonths,
    unlockedCount: badges.filter((b) => b.unlocked).length,
    badges,
    heatmapWeeks,
  };
}
