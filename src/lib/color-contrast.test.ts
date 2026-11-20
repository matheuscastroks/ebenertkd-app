import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");
type RGB = [number, number, number];

/** Opacidade de uma cor (`oklch(L C H / 12%)`); cores sem alfa são opacas. */
function alpha(value: string) {
  const match = value.match(/\/\s*([\d.]+)(%?)\s*\)/);
  if (!match) return 1;
  return match[2] ? Number(match[1]) / 100 : Number(match[1]);
}

function color(value: string): RGB {
  const values = value.replace(/\/.*$/, "").match(/[\d.]+/g)!.map(Number);
  if (value.startsWith("rgb(")) return values.map((v) => v / 255) as RGB;
  if (value.startsWith("hsl(")) {
    const [h, s, l] = [values[0] / 360, values[1] / 100, values[2] / 100];
    const a = s * Math.min(l, 1 - l);
    return [0, 8, 4].map((n) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }) as RGB;
  }
  if (!value.startsWith("oklch(")) throw new Error(`Unsupported color: ${value}`);
  const [l, c, h] = values;
  const a = c * Math.cos(h * Math.PI / 180);
  const b = c * Math.sin(h * Math.PI / 180);
  const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const ss = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss]
    .map((v) => Math.max(0, Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055))) as RGB;
}

function luminance(rgb: RGB) {
  const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** Tokens do primeiro bloco `:root { … }` após o marcador (ex.: uma media query). */
function tokensAfter(marker: string) {
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`Missing block ${marker}`);
  const body = css.slice(css.indexOf(":root {", start)).split("}")[0];
  return Object.fromEntries([...body.matchAll(/--([\w-]+): ([^;]+);/g)].map((m) => [m[1], m[2]]));
}

const light = tokensAfter("@custom-variant dark");
const dark = { ...light, ...tokensAfter("@media (prefers-color-scheme: dark) {") };
const modes: Array<[string, Record<string, string>]> = [
  ["claro", light],
  ["escuro", dark],
  ["claro + alto contraste", { ...light, ...tokensAfter("@media (prefers-contrast: more) and (prefers-color-scheme: light)") }],
  ["escuro + alto contraste", { ...dark, ...tokensAfter("@media (prefers-contrast: more) and (prefers-color-scheme: dark)") }],
];

describe.each(modes)("contraste AA — %s", (theme, tokens) => {
  const raw = (name: string) => {
    const value = tokens[name];
    if (!value) throw new Error(`Missing ${name} in ${theme}`);
    return value;
  };
  // Tokens translúcidos (fills e *-soft) são compostos sobre o cartão, onde aparecem.
  const token = (name: string) => {
    const value = raw(name);
    const a = alpha(value);
    const rgb = color(value);
    if (a === 1) return luminance(rgb);
    const base = color(raw("card"));
    return luminance(rgb.map((v, i) => v * a + base[i] * (1 - a)) as RGB);
  };
  it.each([
    ["primary", "primary-foreground"],
    ["card", "primary-text"],
    ["background", "primary-text"],
    ["success-soft", "success-foreground"],
    ["warning-soft", "warning-foreground"],
    ["info-soft", "info-foreground"],
    ["danger-soft", "danger-text"],
    ["card", "muted-foreground"],
    ["muted", "muted-foreground"],
    ["popover", "muted-foreground"],
    ["destructive", "destructive-foreground"]
  ])("%s / %s tem contraste de pelo menos 4,5:1", (background, foreground) => {
    const a = token(background);
    const b = token(foreground);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
