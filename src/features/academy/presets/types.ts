import type { BeltColorStyle } from "@/features/academy/belt-colors";
import type { RankKey } from "@/features/academy/ranks";

export type PresetField = "display_name" | "colors" | "form_name";

/** Só nomes, cores e formas. Um modelo nunca mexe em alunos, tempos, presenças nem taxas. */
export type PresetRank = {
  rank_key: RankKey;
  display_name: string;
  color_primary: string;
  color_secondary: string;
  color_style: BeltColorStyle;
  form_name: string | null;
  /** Campos incertos: a tela mostra o selo "Revise: valor sugerido". */
  revise?: PresetField[];
};

export type BeltPreset = {
  id: "cbtkd" | "itf" | "kukkiwon";
  version: number;
  label: string;
  description: string;
  formLabel: string;
  levelLabel: string;
  ranks: PresetRank[];
};
