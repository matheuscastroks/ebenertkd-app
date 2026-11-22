import { contrastRatio, isHexColor } from "@/features/academy/validators";

/** Paleta de cores comuns para pré-seleção (o seletor livre cobre as demais). */
export const BELT_COLOR_PALETTE = [
  { id: "branca", label: "Branca", hex: "#ffffff" },
  { id: "cinza", label: "Cinza", hex: "#9ca3af" },
  { id: "amarela", label: "Amarela", hex: "#fbbf24" },
  { id: "laranja", label: "Laranja", hex: "#f97316" },
  { id: "verde", label: "Verde", hex: "#059669" },
  { id: "azul", label: "Azul", hex: "#2563eb" },
  { id: "roxa", label: "Roxa", hex: "#7c3aed" },
  { id: "marrom", label: "Marrom", hex: "#7c4a1e" },
  { id: "vermelha", label: "Vermelha", hex: "#dc2626" },
  { id: "preta", label: "Preta", hex: "#0a0a0a" }
] as const;

export const BELT_COLOR_STYLES = ["solid", "tip", "stripe", "half"] as const;
export type BeltColorStyle = (typeof BELT_COLOR_STYLES)[number];

export const BELT_COLOR_STYLE_LABELS: Record<BeltColorStyle, string> = {
  solid: "Lisa",
  tip: "Ponta",
  stripe: "Listra",
  half: "Meia"
};

/** O que o `BeltBadge` precisa para desenhar uma faixa. */
export type BeltAppearance = {
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  colorStyle: BeltColorStyle;
};

const DARK_TEXT = "#0a0a0a";
const LIGHT_TEXT = "#ffffff";

/** Texto preto ou branco, o que tiver mais contraste sobre `background` (hex `#rrggbb`). */
export function readableTextColor(background: string): string {
  if (!isHexColor(background)) return DARK_TEXT;
  return contrastRatio(DARK_TEXT, background) >= contrastRatio(LIGHT_TEXT, background) ? DARK_TEXT : LIGHT_TEXT;
}

/** Cor da borda da miniatura: faixas muito claras ou muito escuras precisam de contorno para aparecer no fundo. */
export function swatchOutline(background: string): string {
  if (!isHexColor(background)) return "rgba(0,0,0,0.3)";
  return contrastRatio(background, "#f2f2f7") < 1.6 || contrastRatio(background, "#000000") < 1.6 ? "rgba(128,128,128,0.7)" : "rgba(0,0,0,0.25)";
}

function danTipBarsBackground(primary: string, secondary: string, degree: number): string {
  const count = Math.min(Math.max(1, Math.trunc(degree)), 4);
  if (count === 1) {
    return `linear-gradient(to right, ${primary} 0 74%, ${secondary} 74% 84%, ${primary} 84% 100%)`;
  }
  if (count === 2) {
    return `linear-gradient(to right, ${primary} 0 64%, ${secondary} 64% 72%, ${primary} 72% 78%, ${secondary} 78% 86%, ${primary} 86% 100%)`;
  }
  if (count === 3) {
    return `linear-gradient(to right, ${primary} 0 54%, ${secondary} 54% 61%, ${primary} 61% 67%, ${secondary} 67% 74%, ${primary} 74% 80%, ${secondary} 80% 87%, ${primary} 87% 100%)`;
  }
  return `linear-gradient(to right, ${primary} 0 46%, ${secondary} 46% 52%, ${primary} 52% 57%, ${secondary} 57% 63%, ${primary} 63% 68%, ${secondary} 68% 74%, ${primary} 74% 79%, ${secondary} 79% 85%, ${primary} 85% 100%)`;
}

/** `background` CSS da miniatura de uma faixa, conforme o estilo (lisa, ponta, listra ou meia). */
export function beltBackground(
  appearance: Pick<BeltAppearance, "colorPrimary" | "colorSecondary" | "colorStyle">,
  danDegree?: number | null
): string {
  const { colorPrimary: primary, colorSecondary: secondary, colorStyle: style } = appearance;
  switch (style) {
    case "tip":
      if (danDegree && danDegree >= 1) {
        return danTipBarsBackground(primary, secondary, danDegree);
      }
      return `linear-gradient(to right, ${primary} 0 72%, ${secondary} 72% 100%)`;
    case "stripe":
      return `linear-gradient(to bottom, ${primary} 0 36%, ${secondary} 36% 64%, ${primary} 64% 100%)`;
    case "half":
      return `linear-gradient(to bottom, ${primary} 0 50%, ${secondary} 50% 100%)`;
    default:
      return primary;
  }
}

export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

/** Aceita `#rgb`, `rgb`, `#rrggbb` e `rrggbb`; devolve `#rrggbb` ou `null`. Usada no campo de hex livre. */
export function parseHexInput(value: string): string | null {
  const raw = value.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(raw)) return `#${raw.split("").map((char) => char + char).join("")}`;
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return null;
}
