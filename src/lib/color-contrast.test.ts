import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");
const themes = {
  light: css.split(".dark {")[0],
  dark: css.split(".dark {")[1].split("@theme")[0]
};

function luminance(hsl: string) {
  const [h, s, l] = hsl.match(/[\d.]+/g)!.map(Number);
  const a = s / 100 * Math.min(l / 100, 1 - l / 100);
  const rgb = [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

describe.each(Object.entries(themes))("WCAG button colors: %s", (_, block) => {
  const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  function contrast(a: string, b: string) {
    const values = [luminance(tokens[a]), luminance(tokens[b])];
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

  it.each(["background", "card", "popover", "secondary"])("control boundary and focus on %s meet 3:1", (surface) => {
    expect(contrast("input", surface)).toBeGreaterThanOrEqual(3);
    expect(contrast("ring", surface)).toBeGreaterThanOrEqual(3);
    expect(contrast("primary-border", surface)).toBeGreaterThanOrEqual(3);
  });
});
