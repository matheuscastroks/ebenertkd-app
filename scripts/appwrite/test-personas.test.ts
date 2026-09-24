import { describe, expect, it } from "vitest";
import { testPersonas } from "./test-personas";

describe("testPersonas", () => {
  it("exige todas as senhas fora do repositório", () => {
    expect(() => testPersonas({})).toThrow("TEST_ADMIN_PASSWORD");
  });

  it("monta os quatro papéis com segredos fornecidos pelo ambiente", () => {
    const source = { TEST_ADMIN_PASSWORD: "admin-password", TEST_ADULT_PASSWORD: "adult-password", TEST_GUARDIAN_PASSWORD: "guardian-password", TEST_MINOR_PASSWORD: "minor-password" };
    expect(testPersonas(source).map((persona) => persona.role)).toEqual(["admin", "adult_student", "guardian", "minor_student"]);
  });
});
