import type { BeltPreset, PresetRank } from "@/features/academy/presets/types";

const WHITE = "#ffffff";
const YELLOW = "#fbbf24";
const GREEN = "#059669";
const BLUE = "#2563eb";
const RED = "#dc2626";
const BLACK = "#0a0a0a";

const gub = (
  rank_key: PresetRank["rank_key"],
  display_name: string,
  primary: string,
  secondary: string,
  color_style: PresetRank["color_style"],
  form_name: string
): PresetRank => ({ rank_key, display_name, color_primary: primary, color_secondary: secondary, color_style, form_name });

const poom = (rank_key: PresetRank["rank_key"], display_name: string, form_name: string): PresetRank => ({
  rank_key,
  display_name,
  color_primary: RED,
  color_secondary: BLACK,
  color_style: "half",
  form_name,
  revise: ["display_name", "form_name"]
});

const dan = (rank_key: PresetRank["rank_key"], display_name: string, form_name: string, revise = false): PresetRank => ({
  rank_key,
  display_name,
  color_primary: BLACK,
  color_secondary: YELLOW,
  color_style: "tip",
  form_name,
  ...(revise ? { revise: ["form_name" as const] } : {})
});

/**
 * Modelo base: o sistema atual da academia (Branca → Ponta Preta, Taegeuk Il–Pal Jang, Dan 1–3).
 * É também o padrão do código quando não há configuração salva. Cores e nomes variam entre
 * federações estaduais: o professor ajusta depois de aplicar.
 */
export const CBTKD_PRESET: BeltPreset = {
  id: "cbtkd",
  version: 1,
  label: "CBTKD",
  description: "Sistema atual da academia: dez gubs de Branca a Ponta Preta e faixa preta em graus.",
  formLabel: "Poomsae",
  levelLabel: "Gub",
  ranks: [
    gub("gub-10", "Branca", WHITE, WHITE, "solid", "Introductory Poomsae"),
    gub("gub-9", "Ponta Amarela", WHITE, YELLOW, "tip", "Preliminary Poomsae"),
    gub("gub-8", "Amarela", YELLOW, YELLOW, "solid", "Taegeuk Il Jang"),
    gub("gub-7", "Ponta Verde", YELLOW, GREEN, "tip", "Taegeuk Ee Jang"),
    gub("gub-6", "Verde", GREEN, GREEN, "solid", "Taegeuk Sam Jang"),
    gub("gub-5", "Ponta Azul", GREEN, BLUE, "tip", "Taegeuk Sa Jang"),
    gub("gub-4", "Azul", BLUE, BLUE, "solid", "Taegeuk Oh Jang"),
    gub("gub-3", "Ponta Vermelha", BLUE, RED, "tip", "Taegeuk Yuk Jang"),
    gub("gub-2", "Vermelha", RED, RED, "solid", "Taegeuk Chil Jang"),
    gub("gub-1", "Ponta Preta", RED, BLACK, "tip", "Taegeuk Pal Jang"),
    poom("poom-1", "1º Poom", "Koryo"),
    poom("poom-2", "2º Poom", "Keumgang"),
    poom("poom-3", "3º Poom", "Taebaek"),
    poom("poom-4", "4º Poom", "Pyongwon"),
    dan("dan-1", "Preta", "Koryo"),
    dan("dan-2", "Preta 2º Dan", "Keumgang"),
    dan("dan-3", "Preta 3º Dan", "Taebaek"),
    dan("dan-4", "Preta 4º Dan", "Pyongwon", true),
    dan("dan-5", "Preta 5º Dan", "Sipjin", true),
    dan("dan-6", "Preta 6º Dan", "Jitae", true),
    dan("dan-7", "Preta 7º Dan", "Cheonkwon", true),
    dan("dan-8", "Preta 8º Dan", "Hansu", true),
    dan("dan-9", "Preta 9º Dan", "Ilyeo", true)
  ]
};
