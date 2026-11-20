import type { BeltPreset, PresetRank } from "@/features/academy/presets/types";

const WHITE = "#ffffff";
const YELLOW = "#fbbf24";
const GREEN = "#059669";
const BLUE = "#2563eb";
const RED = "#dc2626";
const BLACK = "#0a0a0a";

const gup = (
  rank_key: PresetRank["rank_key"],
  display_name: string,
  primary: string,
  secondary: string,
  color_style: PresetRank["color_style"],
  form_name: string | null
): PresetRank => ({ rank_key, display_name, color_primary: primary, color_secondary: secondary, color_style, form_name, revise: ["form_name"] });

const dan = (rank_key: PresetRank["rank_key"], display_name: string, form_name: string | null): PresetRank => ({
  rank_key,
  display_name,
  color_primary: BLACK,
  color_secondary: YELLOW,
  color_style: "tip",
  form_name,
  revise: ["display_name", "form_name"]
});

/**
 * ITF: dez gups com listra (cor da faixa + listra da próxima) e tuls. A associação exata entre tul e
 * gup e os tuls de cada grau variam entre escolas: todos os campos de forma ficam marcados para revisão.
 * Não usa Poom: as graduações poom-* não fazem parte deste modelo e ficam como estão.
 */
export const ITF_PRESET: BeltPreset = {
  id: "itf",
  version: 1,
  label: "ITF",
  description: "Dez gups com faixa listrada e tuls. Não usa Poom. Revise as formas com o seu professor.",
  formLabel: "Tul",
  levelLabel: "Gup",
  ranks: [
    gup("gub-10", "Branca", WHITE, WHITE, "solid", "Saju Jirugi"),
    gup("gub-9", "Branca listra Amarela", WHITE, YELLOW, "stripe", "Chon-Ji"),
    gup("gub-8", "Amarela", YELLOW, YELLOW, "solid", "Dan-Gun"),
    gup("gub-7", "Amarela listra Verde", YELLOW, GREEN, "stripe", "Do-San"),
    gup("gub-6", "Verde", GREEN, GREEN, "solid", "Won-Hyo"),
    gup("gub-5", "Verde listra Azul", GREEN, BLUE, "stripe", "Yul-Gok"),
    gup("gub-4", "Azul", BLUE, BLUE, "solid", "Joong-Gun"),
    gup("gub-3", "Azul listra Vermelha", BLUE, RED, "stripe", "Toi-Gye"),
    gup("gub-2", "Vermelha", RED, RED, "solid", "Hwa-Rang"),
    gup("gub-1", "Vermelha listra Preta", RED, BLACK, "stripe", "Choong-Moo"),
    dan("dan-1", "Preta 1º Grau", "Kwang-Gae"),
    dan("dan-2", "Preta 2º Grau", "Eui-Am"),
    dan("dan-3", "Preta 3º Grau", "Sam-Il"),
    dan("dan-4", "Preta 4º Grau", "Yon-Gae"),
    dan("dan-5", "Preta 5º Grau", "So-San"),
    dan("dan-6", "Preta 6º Grau", "Tong-Il"),
    dan("dan-7", "Preta 7º Grau", null),
    dan("dan-8", "Preta 8º Grau", null),
    dan("dan-9", "Preta 9º Grau", null)
  ]
};
