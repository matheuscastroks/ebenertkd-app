export const GUB_BELT_OPTIONS = [
  { gub: 9, belt: "Cinza" },
  { gub: 8, belt: "Amarela" },
  { gub: 7, belt: "Laranja" },
  { gub: 6, belt: "Verde" },
  { gub: 5, belt: "Verde escura" },
  { gub: 4, belt: "Azul" },
  { gub: 3, belt: "Azul escura" },
  { gub: 2, belt: "Vermelha" },
  { gub: 1, belt: "Vermelha escura" }
] as const;

export type GubOption = (typeof GUB_BELT_OPTIONS)[number]["gub"];
export type BeltOption = (typeof GUB_BELT_OPTIONS)[number]["belt"];

export const GUB_OPTIONS = GUB_BELT_OPTIONS.map(({ gub }) => gub) as GubOption[];
export const BELT_OPTIONS = GUB_BELT_OPTIONS.map(({ belt }) => belt) as BeltOption[];
export const DUE_DAY_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export function beltForGub(gub: GubOption) {
  return GUB_BELT_OPTIONS.find((option) => option.gub === gub)?.belt;
}

export function gubForBelt(belt: BeltOption) {
  return GUB_BELT_OPTIONS.find((option) => option.belt === belt)?.gub;
}

export function graduationMatches(gub?: number, belt?: string) {
  if (gub == null && !belt) return true;
  return GUB_BELT_OPTIONS.some((option) => option.gub === gub && option.belt === belt);
}

export function calculateNextDueDate(dueDay: number, referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let targetYear = year;
  let targetMonth = month;
  if (day >= dueDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const resolvedDay = Math.min(dueDay, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(resolvedDay).padStart(2, "0")}`;
}

export function calculateDefaultContractDates(
  existingStart?: string | null,
  existingEnd?: string | null,
  referenceDate: Date = new Date()
): { start: string; end: string } {
  const start =
    existingStart?.slice(0, 10) ||
    referenceDate.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  if (existingEnd?.slice(0, 10)) {
    return { start, end: existingEnd.slice(0, 10) };
  }
  const [year, month, day] = start.split("-").map(Number);
  const end = `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start, end };
}
