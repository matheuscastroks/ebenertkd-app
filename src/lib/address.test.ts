import { describe, expect, it } from "vitest";
import { cleanCep, formatAddress, formatCep, parseAddress } from "./address";

describe("address helpers", () => {
  it("cleans and formats CEP correctly", () => {
    expect(cleanCep("21931-580")).toBe("21931580");
    expect(cleanCep("21.931-580")).toBe("21931580");
    expect(cleanCep("")).toBe("");
    expect(cleanCep(null)).toBe("");

    expect(formatCep("21931580")).toBe("21931-580");
    expect(formatCep("21931-580")).toBe("21931-580");
    expect(formatCep("21931")).toBe("21931");
    expect(formatCep("")).toBe("");
  });

  it("formats structured address into a clean single string", () => {
    const formatted = formatAddress({
      street: "Rua Abélia",
      number: "197",
      complement: "Apto 201",
      neighborhood: "Jardim Guanabara",
      city: "Rio de Janeiro",
      state: "RJ",
      cep: "21931-580",
    });

    expect(formatted).toBe(
      "Rua Abélia, 197 - Apto 201, Jardim Guanabara, Rio de Janeiro - RJ, CEP 21931-580"
    );
  });

  it("formats address without complement or cep", () => {
    const formatted = formatAddress({
      street: "Av. Brasil",
      number: "500",
      neighborhood: "Centro",
      city: "Rio de Janeiro",
      state: "RJ",
    });

    expect(formatted).toBe("Av. Brasil, 500, Centro, Rio de Janeiro - RJ");
  });

  it("parses formatted address string back into structured parts", () => {
    const raw =
      "Rua Abélia, 197 - Apto 201, Jardim Guanabara, Rio de Janeiro - RJ, CEP 21931-580";
    const parts = parseAddress(raw);

    expect(parts.cep).toBe("21931-580");
    expect(parts.street).toBe("Rua Abélia");
    expect(parts.number).toBe("197");
    expect(parts.city).toBe("Rio de Janeiro");
    expect(parts.state).toBe("RJ");
  });

  it("parses legacy simple address string", () => {
    const raw = "Rua do Dojô, 100";
    const parts = parseAddress(raw);

    expect(parts.street).toBe("Rua do Dojô");
    expect(parts.number).toBe("100");
  });

  it("handles null or undefined address", () => {
    expect(parseAddress(null)).toEqual({});
    expect(parseAddress("")).toEqual({});
  });
});
