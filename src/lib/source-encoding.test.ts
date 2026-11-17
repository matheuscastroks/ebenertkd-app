import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TextDecoder } from "node:util";
import { expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:tsx?|js|css|json)$/.test(path) ? [path] : [];
  });
}
it("mantém o código em UTF-8 válido para o compilador e o HMR", () => {
  const invalid = sourceFiles("src").filter((path) => {
    try { new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)); return false; }
    catch { return true; }
  });
  expect(invalid).toEqual([]);
});
