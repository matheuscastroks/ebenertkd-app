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

export const gubOptions = [
  { value: 10, belt: "Branca", label: "10º GUB · Branca" },
  { value: 9, belt: "Cinza / Branca ponta amarela", label: "9º GUB · Cinza ou branca com ponta amarela" },
  { value: 8, belt: "Amarela", label: "8º GUB · Amarela" },
  { value: 7, belt: "Laranja / Amarela ponta verde", label: "7º GUB · Laranja ou amarela com ponta verde" },
  { value: 6, belt: "Verde", label: "6º GUB · Verde" },
  { value: 5, belt: "Verde escuro / Verde ponta azul", label: "5º GUB · Verde escuro ou verde com ponta azul" },
  { value: 4, belt: "Azul", label: "4º GUB · Azul" },
  { value: 3, belt: "Azul escuro / Azul ponta vermelha", label: "3º GUB · Azul escuro ou azul com ponta vermelha" },
  { value: 2, belt: "Vermelha", label: "2º GUB · Vermelha" },
  { value: 1, belt: "Vermelho escuro / Vermelha ponta preta", label: "1º GUB · Vermelho escuro ou vermelha com ponta preta" }
] as const;

export function beltForGub(gub: number) {
  return gubOptions.find((option) => option.value === gub)?.belt ?? "Branca";
}

export function resolveDashboardPath(role: AppRole) {
  if (role === "admin") return "/admin";
  if (role === "guardian") return "/responsavel";
  if (role === "minor_student") return "/menor";
  return "/aluno";
}
