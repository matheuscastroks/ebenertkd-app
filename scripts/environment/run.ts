import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { loadProjectEnv } from "./load";

const [mode, command, ...args] = process.argv.slice(2);
if (!["development", "production"].includes(mode) || !["next", "npm"].includes(command)) {
  throw new Error("Use: tsx scripts/environment/run.ts <development|production> <next|npm> ...");
}
if (process.env.EBENER_ENV_LOADED && process.env.EBENER_ENV_LOADED !== mode) {
  throw new Error("Não misture ambientes em comandos encadeados. Abra um comando separado.");
}
process.env.APP_ENV = mode;
loadProjectEnv();
const require = createRequire(import.meta.url);
const entrypoint = command === "next" ? require.resolve("next/dist/bin/next") : process.env.npm_execpath;
if (!entrypoint) throw new Error("Execute o seletor de ambiente via npm run.");
if (command === "next") {
  Object.assign(process.env, { NODE_ENV: args[0] === "dev" ? "development" : "production" });
  process.env.NEXT_BUILD_DIR ??= mode === "development" ? ".next-local" : ".next";
}
console.log(`Ambiente: ${mode} (${mode === "production" ? ".env / variáveis do servidor" : ".env.local"})`);
const child = spawn(process.execPath, [entrypoint, ...(command === "npm" ? ["run"] : []), ...args], {
  stdio: "inherit", env: process.env
});
child.on("error", () => { console.error("Não foi possível iniciar o comando."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
