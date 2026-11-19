import { CBTKD_PRESET } from "@/features/academy/presets/cbtkd";
import type { BeltPreset } from "@/features/academy/presets/types";

/**
 * O Kukkiwon certifica Dan e Poom e não padroniza as cores dos gubs: o modelo usa os mesmos nomes e
 * formas do CBTKD, com o termo "Geup". As cores dos gubs ficam marcadas para revisão.
 */
export const KUKKIWON_PRESET: BeltPreset = {
  id: "kukkiwon",
  version: 1,
  label: "Kukkiwon",
  description: "Mesmos nomes e formas do CBTKD, com o termo Geup. O Kukkiwon não padroniza as cores dos gubs.",
  formLabel: "Poomsae",
  levelLabel: "Geup",
  ranks: CBTKD_PRESET.ranks.map((rank) =>
    rank.rank_key.startsWith("gub-") ? { ...rank, revise: [...(rank.revise ?? []), "colors" as const] } : { ...rank }
  )
};
