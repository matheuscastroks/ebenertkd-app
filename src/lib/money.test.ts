import { describe, expect, it } from "vitest";
import { centsToReaisInput, formatBrl, reaisToCents } from "@/lib/money";

describe("money", () => {
  it.each([
    ["150", 15000],
    ["150.50", 15050],
    ["150,50", 15050],
    ["1.250,75", 125075],
    [0, 0]
  ])("converte %s reais para %i centavos", (value, expected) => {
    expect(reaisToCents(value)).toBe(expected);
  });

  it.each(["", "1,234", "abc", "-10"])("rejeita o valor inválido %s", (value) => {
    expect(() => reaisToCents(value)).toThrow("money_invalid");
  });

  it("prepara valores persistidos para campos em reais", () => {
    expect(centsToReaisInput(15000)).toBe("150.00");
    expect(centsToReaisInput(null)).toBe("");
  });

  it("formata valores para exibição em reais", () => {
    expect(formatBrl(15050)).toMatch(/150,50/);
  });
});
