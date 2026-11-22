import { describe, expect, it } from "vitest";
import {
  applyInputMask,
  formatCnpjMask,
  formatCpfCnpjMask,
  formatCpfMask,
  formatStateUfMask,
} from "@/lib/input-masks";

describe("input-masks", () => {
  it("formats CPF progressively and clamps to 11 digits", () => {
    expect(formatCpfMask("123")).toBe("123");
    expect(formatCpfMask("123456")).toBe("123.456");
    expect(formatCpfMask("123456789")).toBe("123.456.789");
    expect(formatCpfMask("12345678901999")).toBe("123.456.789-01");
  });

  it("formats CNPJ progressively and clamps to 14 digits", () => {
    expect(formatCnpjMask("12")).toBe("12");
    expect(formatCnpjMask("12345")).toBe("12.345");
    expect(formatCnpjMask("12345678")).toBe("12.345.678");
    expect(formatCnpjMask("123456780001")).toBe("12.345.678/0001");
    expect(formatCnpjMask("1234567800019599")).toBe("12.345.678/0001-95");
  });

  it("switches automatically between CPF and CNPJ in cpf_cnpj mode", () => {
    expect(formatCpfCnpjMask("12345678901")).toBe("123.456.789-01");
    expect(formatCpfCnpjMask("12345678000195")).toBe("12.345.678/0001-95");
  });

  it("formats UF as 2 uppercase letters", () => {
    expect(formatStateUfMask("r1j2x")).toBe("RJ");
  });

  it("delegates cep, phone and none masks in applyInputMask", () => {
    expect(applyInputMask("cep", "21931580")).toBe("21931-580");
    expect(applyInputMask("phone", "21965188988")).toBe("(21) 9 6518-8988");
    expect(applyInputMask("none", "email@exemplo.com")).toBe("email@exemplo.com");
  });
});
