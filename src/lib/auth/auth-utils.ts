import { ROUTES } from "@/lib/navigation/routes";

export type AppRole = "admin" | "adult_student" | "guardian" | "minor_student";
export type AppCapability = "admin" | "student" | "guardian";

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string) {
  const cpf = normalizeCpf(value);

  if (cpf.length !== 11 || /^([0-9])\1+$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (length: number) => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }

    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

export function cpfToStudentEmail(cpf: string) {
  return `${normalizeCpf(cpf)}@aluno.ebenertkd.app`;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function minorTechnicalEmail(username: string) {
  return `${normalizeUsername(username)}@minor.ebenertkd.internal`;
}

export function resolveDashboardPath(role: AppRole) {
  if (role === "admin") return ROUTES.admin;
  if (role === "guardian") return ROUTES.guardian;
  return ROUTES.student;
}
