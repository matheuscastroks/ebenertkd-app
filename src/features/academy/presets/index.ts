import { CBTKD_PRESET } from "@/features/academy/presets/cbtkd";
import { ITF_PRESET } from "@/features/academy/presets/itf";
import { KUKKIWON_PRESET } from "@/features/academy/presets/kukkiwon";
import type { BeltPreset } from "@/features/academy/presets/types";

export const BELT_PRESETS: readonly BeltPreset[] = [CBTKD_PRESET, ITF_PRESET, KUKKIWON_PRESET];

export function findBeltPreset(id: string): BeltPreset | undefined {
  return BELT_PRESETS.find((preset) => preset.id === id);
}

export type { BeltPreset, PresetRank, PresetField } from "@/features/academy/presets/types";
