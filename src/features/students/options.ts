export const GUB_BELT_OPTIONS = [
  { gub: 10, belt: "Branca", nameEn: "White", poomsae: "Introductory Poomsae" },
  { gub: 9, belt: "Ponta Amarela", nameEn: "Yellow Tip", poomsae: "Preliminary Poomsae" },
  { gub: 8, belt: "Amarela", nameEn: "Yellow", poomsae: "Taegeuk Il Jang" },
  { gub: 7, belt: "Ponta Verde", nameEn: "Green Tip", poomsae: "Taegeuk Ee Jang" },
  { gub: 6, belt: "Verde", nameEn: "Green", poomsae: "Taegeuk Sam Jang" },
  { gub: 5, belt: "Ponta Azul", nameEn: "Blue Tip", poomsae: "Taegeuk Sa Jang" },
  { gub: 4, belt: "Azul", nameEn: "Blue", poomsae: "Taegeuk Oh Jang" },
  { gub: 3, belt: "Ponta Vermelha", nameEn: "Red Tip", poomsae: "Taegeuk Yuk Jang" },
  { gub: 2, belt: "Vermelha", nameEn: "Red", poomsae: "Taegeuk Chil Jang" },
  { gub: 1, belt: "Ponta Preta", nameEn: "Black Tip", poomsae: "Taegeuk Pal Jang" }
] as const;

export const DAN_BELT_OPTIONS = [
  { dan: 1, belt: "Preta", nameEn: "1st Dan Black Belt", poomsae: "Koryo" },
  { dan: 2, belt: "Preta 2º Dan", nameEn: "2nd Dan Black Belt", poomsae: "Keumgang" },
  { dan: 3, belt: "Preta 3º Dan", nameEn: "3rd Dan Black Belt", poomsae: "Taebaek" }
] as const;

export type GubOption = (typeof GUB_BELT_OPTIONS)[number]["gub"];
export type BeltOption =
  | (typeof GUB_BELT_OPTIONS)[number]["belt"]
  | (typeof DAN_BELT_OPTIONS)[number]["belt"];

export const GUB_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
export const BELT_OPTIONS = [
  "Branca",
  "Ponta Amarela",
  "Amarela",
  "Ponta Verde",
  "Verde",
  "Ponta Azul",
  "Azul",
  "Ponta Vermelha",
  "Vermelha",
  "Ponta Preta",
  "Preta",
  "Preta 1º Dan",
  "Preta 2º Dan",
  "Preta 3º Dan"
] as const;
export const DUE_DAY_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export function beltForGub(gub: number) {
  return GUB_BELT_OPTIONS.find((option) => option.gub === gub)?.belt;
}

export function poomsaeForGub(gub: number) {
  const gubItem = GUB_BELT_OPTIONS.find((option) => option.gub === gub);
  if (gubItem) return gubItem.poomsae;
  return DAN_BELT_OPTIONS[0]?.poomsae ?? "Koryo";
}

export function gubForBelt(belt: string) {
  const normalized = belt.toLowerCase().trim().replace(/^faixa\s+/, "");
  const direct = GUB_BELT_OPTIONS.find(
    (option) => option.belt.toLowerCase() === normalized
  );
  if (direct) return direct.gub;

  // Nomes em inglês ou variações diretas
  if (normalized === "white" || normalized === "branca") return 10;
  if (normalized === "yellow tip" || normalized === "ponta amarela" || normalized === "branca ponta amarela") return 9;
  if (normalized === "amarela" || normalized === "yellow") return 8;
  if (normalized === "green tip" || normalized === "ponta verde" || normalized === "amarela ponta verde") return 7;
  if (normalized === "verde" || normalized === "green") return 6;
  if (normalized === "blue tip" || normalized === "ponta azul" || normalized === "verde ponta azul") return 5;
  if (normalized === "azul" || normalized === "blue") return 4;
  if (normalized === "red tip" || normalized === "ponta vermelha" || normalized === "azul ponta vermelha") return 3;
  if (normalized === "vermelha" || normalized === "red") return 2;
  if (normalized === "black tip" || normalized === "ponta preta" || normalized === "vermelha ponta preta") return 1;
  if (normalized.includes("preta") || normalized.includes("black") || normalized.includes("dan")) return 0;
  return undefined;
}

export function graduationMatches(gub?: number, belt?: string) {
  if (gub == null && !belt) return true;
  if (gub == null || !belt) return false;
  return gubForBelt(belt) === gub;
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
