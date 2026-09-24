export const BELT_OPTIONS = [
  "Branca",
  "Amarela",
  "Laranja",
  "Verde",
  "Roxa",
  "Azul",
  "Marrom",
  "Vermelha",
  "Vermelha e preta (Poom)",
  "Preta"
] as const;
export type BeltOption = (typeof BELT_OPTIONS)[number];

export const GUB_OPTIONS = [9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
export const DUE_DAY_OPTIONS = [5, 10, 15, 20, 25, 30] as const;
