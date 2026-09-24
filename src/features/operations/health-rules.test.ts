import { describe, expect, it } from "vitest";
import { formatBytes, scheduledJobHealth, storageHealth } from "./health-rules";

describe("saúde operacional", () => {
  it("aplica os limites de armazenamento em 70% e 85%", () => {
    expect(storageHealth(69, 100).level).toBe("normal");
    expect(storageHealth(70, 100).level).toBe("warning");
    expect(storageHealth(85, 100).level).toBe("critical");
    expect(storageHealth(10).level).toBe("unknown");
  });

  it("considera crítico quando não há sucesso em 24 horas", () => {
    const now = new Date("2026-09-24T12:00:00.000Z");
    expect(scheduledJobHealth("2026-09-23T12:01:00.000Z", now).level).toBe("normal");
    expect(scheduledJobHealth("2026-09-23T11:59:00.000Z", now).level).toBe("critical");
    expect(scheduledJobHealth(undefined, now).level).toBe("critical");
  });

  it("formata bytes para leitura operacional", () => {
    expect(formatBytes(1_048_576)).toBe("1 MB");
  });
});
