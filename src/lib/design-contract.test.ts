import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import baseline from "./design-contract-baseline.json";

const rules = {
  tinyText: /text-\[\d+(?:\.\d+)?px\]|text-\[0\.8rem\]/g,
  transitionAll: /transition-all/g,
  heavyShadow: /shadow-(?:lg|2xl)/g,
  depth: /depth-[\w-]+/g,
  heavyFont: /font-(?:bold|black)/g,
  arbitraryRadius: /rounded-\[[^\]]+\]/g,
  rawColor: /(?:emerald|amber|red|rose|sky)-\d+/g
};

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : path.endsWith(".tsx") && !/\.test\.tsx$/.test(path) ? [path] : [];
  });
}

it("impede novos desvios do contrato sem ampliar a dívida documentada por arquivo", () => {
  const violations: string[] = [];
  for (const path of files("src")) {
    const relative = path.replaceAll("\\", "/");
    const source = readFileSync(path, "utf8");
    const allowed = (baseline as Record<string, Partial<Record<keyof typeof rules, number>>>)[relative] ?? {};
    for (const [name, pattern] of Object.entries(rules)) {
      const count = [...source.matchAll(pattern)].length;
      const budget = allowed[name as keyof typeof rules] ?? 0;
      if (count > budget) violations.push(`${relative}: ${name} ${count} (máximo temporário ${budget})`);
    }
  }
  expect(violations).toEqual([]);
});
