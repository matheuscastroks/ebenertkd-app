import assert from "node:assert/strict";
import { assertIsolatedEnvironment } from "./e2e-environment";

assertIsolatedEnvironment();
for (const name of ["APPWRITE_API_KEY", "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD", "E2E_ADULT_EMAIL", "E2E_ADULT_PASSWORD", "E2E_GUARDIAN_EMAIL", "E2E_GUARDIAN_PASSWORD", "E2E_MINOR_PASSWORD"]) {
  assert(process.env[name]?.trim(), `Configure ${name} before enabling authenticated E2E.`);
}
console.log("Ambiente isolado e variáveis obrigatórias de E2E verificados.");
