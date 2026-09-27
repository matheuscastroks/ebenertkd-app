export type TestPersona = {
  key: "admin" | "adult" | "guardian" | "minor";
  name: string;
  email: string;
  password: string;
  username?: string;
  role: "admin" | "adult_student" | "guardian" | "minor_student";
  capabilities: Array<"admin" | "student" | "guardian">;
  route: "/admin" | "/aluno" | "/responsavel";
};

type EnvironmentSource = Record<string, string | undefined>;

function required(source: EnvironmentSource, name: string) {
  const value = source[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório para contas de teste.`);
  return value;
}

export function testPersonas(source: EnvironmentSource = process.env): TestPersona[] {
  return [
    { key: "admin", name: "Ebener Santos", email: "ricardo.almeida@ebenertkd.app", password: required(source, "TEST_ADMIN_PASSWORD"), role: "admin", capabilities: ["admin"], route: "/admin" },
    { key: "adult", name: "Camila Ferreira", email: "camila.ferreira@ebenertkd.app", password: required(source, "TEST_ADULT_PASSWORD"), role: "adult_student", capabilities: ["student"], route: "/aluno" },
    { key: "guardian", name: "Juliana Mendes", email: "juliana.mendes@ebenertkd.app", password: required(source, "TEST_GUARDIAN_PASSWORD"), role: "guardian", capabilities: ["guardian"], route: "/responsavel" },
    { key: "minor", name: "Lucas Mendes", email: "lucas.mendes@minor.ebenertkd.internal", username: "lucas.mendes", password: required(source, "TEST_MINOR_PASSWORD"), role: "minor_student", capabilities: ["student"], route: "/aluno" }
  ];
}
