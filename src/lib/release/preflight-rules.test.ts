import { describe, expect, it } from "vitest";
import { configurationChecks, isRecentSuccess, storageBelowCritical } from "./preflight-rules";

describe("release preflight rules", () => {
  it("bloqueia HTTP, segredos ausentes e cota inválida", () => {
    expect(configurationChecks({ APP_URL: "http://localhost:3000" }).every((check) => check.ok)).toBe(false);
  });

  it("aceita sucesso operacional com no máximo 24 horas", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    expect(isRecentSuccess("2026-09-23T12:00:00Z", now)).toBe(true);
    expect(isRecentSuccess("2026-09-23T11:59:59Z", now)).toBe(false);
  });

  it("bloqueia lançamento a partir de 85% de armazenamento", () => {
    expect(storageBelowCritical(84, 100)).toBe(true);
    expect(storageBelowCritical(85, 100)).toBe(false);
  });
});
