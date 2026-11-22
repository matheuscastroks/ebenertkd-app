import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

/** Load exactly one environment. Next's normal .env.local fallback would mix targets. */
export function loadProjectEnv(directory = process.cwd()) {
  const mode = process.env.APP_ENV ?? "development";
  if (mode !== "development" && mode !== "production") {
    throw new Error("APP_ENV deve ser development ou production.");
  }
  if (process.env.EBENER_ENV_LOADED === mode) return;
  const filename = mode === "production" ? ".env" : ".env.local";
  const file = path.join(directory, filename);
  if (existsSync(file)) {
    const values = parseEnv(readFileSync(file, "utf8"));
    for (const [key, value] of Object.entries(values)) process.env[key] ??= value;
  }
  // Next may force a reload after an env-file edit. Reserve omitted keys too,
  // so another environment cannot fill the omissions during that reload.
  for (const other of [".env", ".env.local", ".env.production", ".env.production.local", ".env.development", ".env.development.local"]) {
    const otherPath = path.join(directory, other);
    if (!existsSync(otherPath)) continue;
    for (const key of Object.keys(parseEnv(readFileSync(otherPath, "utf8")))) process.env[key] ??= "";
  }
  // Next children inherit this marker, so they cannot load the other file afterwards.
  process.env.__NEXT_PROCESSED_ENV = "true";
  process.env.EBENER_ENV_LOADED = mode;
  process.env.APP_ENV = mode;
}
