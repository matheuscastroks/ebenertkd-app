import { describe, expect, it } from "vitest";
import { safeErrorMessage } from "./safe-error";

describe("safeErrorMessage", () => {
  it("redige credenciais, e-mail e parâmetros de recuperação", () => {
    const result = safeErrorMessage(new Error("authorization: Bearer abc.def email ana@example.com password=Segredo123 secret=xyz"));
    expect(result).not.toContain("abc.def");
    expect(result).not.toContain("ana@example.com");
    expect(result).not.toContain("Segredo123");
    expect(result).not.toContain("xyz");
    expect(result).toContain("[REDACTED]");
  });

  it("limita mensagens e normaliza quebras de linha", () => {
    const result = safeErrorMessage(`falha\n${"x".repeat(400)}`);
    expect(result).toHaveLength(240);
    expect(result).not.toContain("\n");
  });
});
