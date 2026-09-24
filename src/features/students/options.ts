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
