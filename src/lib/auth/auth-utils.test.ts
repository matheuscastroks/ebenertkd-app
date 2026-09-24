import { cpfToStudentEmail, normalizeCpf, resolveDashboardPath } from "@/lib/auth/auth-utils";

describe("normalizeCpf", () => {
  it("removes punctuation from cpf input", () => {
    expect(normalizeCpf("123.456.789-00")).toBe("12345678900");
  });

  it("keeps only digits from noisy input", () => {
    expect(normalizeCpf(" 123a456b789-00 ")).toBe("12345678900");
  });
});

describe("cpfToStudentEmail", () => {
  it("maps the student cpf to the internal auth email format", () => {
    expect(cpfToStudentEmail("123.456.789-00")).toBe("12345678900@aluno.ebenertkd.app");
  });
});

describe("resolveDashboardPath", () => {
  it("routes admins to the admin dashboard", () => {
    expect(resolveDashboardPath("admin")).toBe("/admin");
  });

  it("routes students to the student dashboard", () => {
    expect(resolveDashboardPath("adult_student")).toBe("/aluno");
  });

  it("separates guardian and minor dashboards", () => {
    expect(resolveDashboardPath("guardian")).toBe("/responsavel");
    expect(resolveDashboardPath("minor_student")).toBe("/menor");
  });
});
