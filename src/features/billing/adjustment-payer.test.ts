import { describe, expect, it } from "vitest";
import { extractPhone, pickPayerPhone } from "./adjustment-payer";

describe("adjustment payer", () => {
  it("extrai o telefone de um texto livre", () => {
    expect(extractPhone("Maria - (11) 99999-8888")).toBe("11999998888");
    expect(extractPhone("Maria +55 11 98888-7777")).toBe("5511988887777");
    expect(extractPhone("sem número")).toBeNull();
    expect(extractPhone(null)).toBeNull();
  });

  it("usa o contato do responsável para menores e o WhatsApp do aluno para adultos", () => {
    expect(pickPayerPhone({ isMinor: true, whatsapp: "11911112222", guardianContact: "Pai 11 97777-6666" })).toBe("11977776666");
    expect(pickPayerPhone({ isMinor: true, whatsapp: "11911112222", guardianContact: "Pai" })).toBeNull();
    expect(pickPayerPhone({ isMinor: false, whatsapp: "(11) 91111-2222", guardianContact: "x" })).toBe("11911112222");
    expect(pickPayerPhone({ isMinor: false, whatsapp: "" })).toBeNull();
  });
});
