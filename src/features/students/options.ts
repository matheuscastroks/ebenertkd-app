import { DEFAULT_BILLING_POLICY, DEFAULT_CONTRACT_POLICY } from "@/features/academy/defaults";

export const DUE_DAY_OPTIONS: readonly number[] = DEFAULT_BILLING_POLICY.due_day_options;

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
  referenceDate: Date = new Date(),
  durationMonths: number = DEFAULT_CONTRACT_POLICY.default_duration_months
): { start: string; end: string } {
  const start =
    existingStart?.slice(0, 10) ||
    referenceDate.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  if (existingEnd?.slice(0, 10)) {
    return { start, end: existingEnd.slice(0, 10) };
  }
  const [year, month, day] = start.split("-").map(Number);
  return { start, end: addMonthsClamped(year, month, day, durationMonths) };
}

/** Soma meses a uma data (AAAA, M, D) mantendo o dia, ou o último dia do mês quando ele não existe. */
export function addMonthsClamped(year: number, month: number, day: number, months: number): string {
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = index % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
