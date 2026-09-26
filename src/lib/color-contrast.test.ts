import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");
const themes = {
  light: css.split(".dark {")[0],
  dark: css.split(".dark {")[1].split("@theme")[0]
};

function luminance(color: string) {
  const [lightness, chroma, hue] = color.match(/[\d.]+/g)!.map(Number);
  const a = chroma * Math.cos(hue * Math.PI / 180);
  const b = chroma * Math.sin(hue * Math.PI / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ].map((channel) => Math.max(0, Math.min(1, channel)));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

describe.each(Object.entries(themes))("WCAG button colors: %s", (_, block) => {
  const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  function resolve(token: string): string {
    const alias = tokens[token].match(/^var\(--([\w-]+)\)$/);
    return alias ? resolve(alias[1]) : tokens[token];
  }
  function contrast(a: string, b: string) {
    const values = [luminance(resolve(a)), luminance(resolve(b))];
    return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
  }

  it.each([
    ["primary-foreground", "primary"], ["primary-foreground", "primary-hover"],
    ["destructive-foreground", "destructive"], ["destructive-foreground", "destructive-hover"],
    ["secondary-foreground", "secondary"], ["secondary-foreground", "accent"],
    ["foreground", "background"], ["foreground", "muted"],
    ["primary-text", "background"], ["primary-text", "card"], ["primary-text", "popover"]
  ])("%s on %s meets 4.5:1 for normal text", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["background", "card", "popover", "secondary"])("primary button boundary and keyboard outline on %s meet 3:1", (surface) => {
    // The explicit button outline uses foreground, independently of the default shadcn ring.
    expect(contrast("foreground", surface)).toBeGreaterThanOrEqual(3);
    expect(contrast("primary-border", surface)).toBeGreaterThanOrEqual(3);
  });
});
