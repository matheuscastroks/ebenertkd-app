// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const rel = (file: string) => path.relative(SRC, file).replaceAll("\\", "/");
const files = sourceFiles(SRC).map((file) => ({ file: rel(file), text: readFileSync(file, "utf8") }));

it("todo unstable_cache direto declara tags e revalidate (sem cache que nunca invalida)", () => {
  const problems: string[] = [];
  for (const { file, text } of files) {
    if (file === "lib/cache/cached-read.ts") continue;
    for (const match of text.matchAll(/unstable_cache\s*\(/g)) {
      const tail = text.slice(match.index! + 1, match.index! + 8000).split(/unstable_cache\s*\(/)[0];
      const options = /\{[^{}]*\btags\s*:[^{}]*\}/.exec(tail)?.[0] ?? "";
      if (!/\brevalidate\s*:/.test(options)) problems.push(file);
    }
  }
  expect(problems).toEqual([]);
});

it("toda chamada de cachedRead declara name, key, tags e revalidate", () => {
  const problems: string[] = [];
  const listed: string[] = [];
  for (const { file, text } of files) {
    if (file === "lib/cache/cached-read.ts") continue;
    for (const match of text.matchAll(/cachedRead(?:<[^>(]*>)?\(\s*\{([\s\S]*?)\}\s*,\s*(?:async|\()/g)) {
      const body = match[1];
      const name = body.match(/name:\s*["'`]([^"'`]+)["'`]/)?.[1];
      listed.push(`${file}:${name ?? "?"}`);
      for (const field of ["name", "key", "tags", "revalidate"]) if (!new RegExp(`\\b${field}\\s*:`).test(body)) problems.push(`${file}: falta ${field}`);
    }
  }
  expect(problems).toEqual([]);
  expect(listed.length).toBeGreaterThan(0);
});

it("nomes de leituras cacheadas são únicos", () => {
  const names = files.flatMap(({ text }) => [...text.matchAll(/cachedRead(?:<[^>(]*>)?\(\s*\{[\s\S]*?name:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]));
  expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
});

it("funções cacheadas nunca recebem cookie, sessão ou o segredo da sessão", () => {
  const offenders = files.filter(({ text }) => /cachedRead[\s\S]{0,400}(cookies\(\)|createAppwriteSessionClient|APPWRITE_SESSION_COOKIE)/.test(text)).map(({ file }) => file);
  expect(offenders).toEqual([]);
});
