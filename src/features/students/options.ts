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

export type GubOption = (typeof GUB_BELT_OPTIONS)[number]["gub"] | 0;
export type BeltOption =
  | (typeof GUB_BELT_OPTIONS)[number]["belt"]
  | (typeof DAN_BELT_OPTIONS)[number]["belt"];

export const GUB_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;
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
  "Preta 2º Dan",
  "Preta 3º Dan"
] as const;
export const DUE_DAY_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

export function beltForGub(gub: number) {
  if (gub === 0) return "Preta";
  return GUB_BELT_OPTIONS.find((option) => option.gub === gub)?.belt;
}

export function poomsaeForGub(gub: number, belt?: string) {
  const gubItem = GUB_BELT_OPTIONS.find((option) => option.gub === gub);
  if (gubItem) return gubItem.poomsae;

  if (belt) {
    const normalized = belt.toLowerCase().trim();
    if (normalized.includes("3º dan") || normalized.includes("3rd dan") || normalized.includes("3 dan")) {
      return "Taebaek";
    }
    if (normalized.includes("2º dan") || normalized.includes("2nd dan") || normalized.includes("2 dan")) {
      return "Keumgang";
    }
  }
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

export function getNextGraduation(currentGub: number | null | undefined): {
  targetGub: GubOption | 0;
  targetBelt: BeltOption;
} | null {
  if (currentGub == null || currentGub <= 0) return null;
  const nextGub = currentGub - 1;
  if (nextGub === 0) {
    return { targetGub: 0, targetBelt: "Preta" };
  }
  const nextBelt = beltForGub(nextGub);
  if (!nextBelt) return null;
  return { targetGub: nextGub as GubOption, targetBelt: nextBelt };
}

export type BeltColorTheme = {
  name: string;
  gub?: number;
  isBlackBelt: boolean;
  pillClass: string;
};

export function getBeltTheme(belt?: string | null, gub?: number | null): BeltColorTheme {
  const resolvedGub = gub ?? (belt ? gubForBelt(belt) : undefined);

  if (resolvedGub === 10) {
    return {
      name: "Branca",
      gub: 10,
      isBlackBelt: false,
      pillClass: "bg-neutral-50 text-neutral-800 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-700",
    };
  }
  if (resolvedGub === 9) {
    return {
      name: "Ponta Amarela",
      gub: 9,
      isBlackBelt: false,
      pillClass: "bg-amber-50/80 text-neutral-900 border-amber-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-amber-500/70",
    };
  }
  if (resolvedGub === 8) {
    return {
      name: "Amarela",
      gub: 8,
      isBlackBelt: false,
      pillClass: "bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/60",
    };
  }
  if (resolvedGub === 7) {
    return {
      name: "Ponta Verde",
      gub: 7,
      isBlackBelt: false,
      pillClass: "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-neutral-900 dark:text-emerald-300 dark:border-emerald-700/70",
    };
  }
  if (resolvedGub === 6) {
    return {
      name: "Verde",
      gub: 6,
      isBlackBelt: false,
      pillClass: "bg-emerald-100 text-emerald-950 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/60",
    };
  }
  if (resolvedGub === 5) {
    return {
      name: "Ponta Azul",
      gub: 5,
      isBlackBelt: false,
      pillClass: "bg-sky-50 text-sky-950 border-sky-300 dark:bg-neutral-900 dark:text-sky-300 dark:border-sky-700/70",
    };
  }
  if (resolvedGub === 4) {
    return {
      name: "Azul",
      gub: 4,
      isBlackBelt: false,
      pillClass: "bg-blue-100 text-blue-950 border-blue-400 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700/60",
    };
  }
  if (resolvedGub === 3) {
    return {
      name: "Ponta Vermelha",
      gub: 3,
      isBlackBelt: false,
      pillClass: "bg-rose-50 text-rose-950 border-rose-300 dark:bg-neutral-900 dark:text-rose-300 dark:border-rose-700/70",
    };
  }
  if (resolvedGub === 2) {
    return {
      name: "Vermelha",
      gub: 2,
      isBlackBelt: false,
      pillClass: "bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700/60",
    };
  }
  if (resolvedGub === 1) {
    return {
      name: "Ponta Preta",
      gub: 1,
      isBlackBelt: false,
      pillClass: "bg-neutral-100 text-neutral-950 border-neutral-400 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-600",
    };
  }
  if (resolvedGub === 0 || (belt && belt.toLowerCase().includes("preta"))) {
    return {
      name: belt ?? "Preta",
      gub: 0,
      isBlackBelt: true,
      pillClass: "bg-neutral-900 text-amber-300 border-amber-500/50 dark:bg-neutral-950 dark:text-amber-300 dark:border-amber-500/60 shadow-xs",
    };
  }

  return {
    name: belt ?? "Não informada",
    gub: resolvedGub,
    isBlackBelt: false,
    pillClass: "bg-muted text-muted-foreground border-border",
  };
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
