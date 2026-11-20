/**
 * Regras puras da calculadora de mensalidade. Tudo em centavos; percentuais em 0–100.
 * Resultados de "quanto cobrar" e "quantos alunos" sempre arredondam para cima.
 */

export type PlanningInput = {
  /** Soma dos custos fixos mensais (aluguel, energia, internet...). */
  fixedCostsCents: number;
  /** Salário desejado do professor. */
  proLaboreCents: number;
  /** Reserva/investimento mensal (tatames novos, por exemplo). */
  reserveCents: number;
  /** Custo variável por aluno (material, taxa de federação rateada). */
  variableCostCents: number;
  /** Taxa do meio de pagamento em %. PIX manual = 0. */
  paymentFeePercent: number;
  /** Inadimplência esperada em %. */
  defaultRatePercent: number;
};

export type PlanningFailure = "no_students" | "unreachable" | "loss_per_student";

export type PlanResult<T> = { ok: true; value: T } | { ok: false; reason: PlanningFailure };

export const PLANNING_FAILURE_MESSAGES: Record<PlanningFailure, string> = {
  no_students: "Informe ao menos 1 aluno para calcular a mensalidade.",
  unreachable: "Com essa inadimplência e essa taxa, nenhuma mensalidade cobre os custos.",
  loss_per_student: "Com esses valores, cada aluno dá prejuízo: o custo por aluno é maior do que ele deixa de receita."
};

const EPSILON = 1e-9;

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(100, value);
}

function ceilCents(value: number) {
  // "+ 0" evita devolver -0 quando o valor é zero.
  return Math.ceil(value - EPSILON) + 0;
}

/** Troca valores vazios, negativos ou inválidos por zero e limita percentuais a 0–100. */
export function sanitizePlanningInput(input: PlanningInput): PlanningInput {
  return {
    fixedCostsCents: Math.round(finiteNonNegative(input.fixedCostsCents)),
    proLaboreCents: Math.round(finiteNonNegative(input.proLaboreCents)),
    reserveCents: Math.round(finiteNonNegative(input.reserveCents)),
    variableCostCents: Math.round(finiteNonNegative(input.variableCostCents)),
    paymentFeePercent: clampPercent(input.paymentFeePercent),
    defaultRatePercent: clampPercent(input.defaultRatePercent)
  };
}

/** Fração da mensalidade que realmente chega ao caixa: (1 - inadimplência) × (1 - taxa). */
export function collectionFactor(input: PlanningInput) {
  const clean = sanitizePlanningInput(input);
  return (1 - clean.defaultRatePercent / 100) * (1 - clean.paymentFeePercent / 100);
}

/** necessidadeMensal = custos fixos + pró-labore + reserva. */
export function monthlyNeedCents(input: PlanningInput) {
  const clean = sanitizePlanningInput(input);
  return clean.fixedCostsCents + clean.proLaboreCents + clean.reserveCents;
}

/** Quanto cada aluno deixa no caixa por mês (pode ser negativo). */
export function effectiveRevenuePerStudentCents(feeCents: number, input: PlanningInput) {
  const clean = sanitizePlanningInput(input);
  return Math.round(finiteNonNegative(feeCents) * collectionFactor(clean) - clean.variableCostCents);
}

/** Mensalidade mínima para cobrir a necessidade mensal com `students` alunos. */
export function requiredFeeCents(students: number, input: PlanningInput): PlanResult<number> {
  const clean = sanitizePlanningInput(input);
  const count = Math.floor(finiteNonNegative(students));
  if (count <= 0) return { ok: false, reason: "no_students" };
  const factor = collectionFactor(clean);
  if (factor <= 0) return { ok: false, reason: "unreachable" };
  const fee = (monthlyNeedCents(clean) / count + clean.variableCostCents) / factor;
  return { ok: true, value: ceilCents(fee) };
}

/** Alunos necessários para cobrir custos + pró-labore + reserva a esta mensalidade. */
export function requiredStudents(feeCents: number, input: PlanningInput): PlanResult<number> {
  const clean = sanitizePlanningInput(input);
  const perStudent = effectiveRevenuePerStudentCents(feeCents, clean);
  if (perStudent <= 0) return { ok: false, reason: "loss_per_student" };
  return { ok: true, value: ceilCents(monthlyNeedCents(clean) / perStudent) };
}

/** Ponto de equilíbrio: alunos para cobrir só os custos fixos (sem pró-labore nem reserva). */
export function breakEvenStudents(feeCents: number, input: PlanningInput): PlanResult<number> {
  const clean = sanitizePlanningInput(input);
  const perStudent = effectiveRevenuePerStudentCents(feeCents, clean);
  if (perStudent <= 0) return { ok: false, reason: "loss_per_student" };
  return { ok: true, value: ceilCents(clean.fixedCostsCents / perStudent) };
}

/** Folga (positiva) ou déficit (negativo) do mês. */
export function monthlyMarginCents(students: number, feeCents: number, input: PlanningInput) {
  const count = Math.floor(finiteNonNegative(students));
  return Math.round(count * effectiveRevenuePerStudentCents(feeCents, input)) - monthlyNeedCents(input);
}

/** Folga/déficit só sobre custos fixos (o que sobra antes do pró-labore e da reserva). */
export function marginAfterFixedCostsCents(students: number, feeCents: number, input: PlanningInput) {
  const clean = sanitizePlanningInput(input);
  const count = Math.floor(finiteNonNegative(students));
  return Math.round(count * effectiveRevenuePerStudentCents(feeCents, clean)) - clean.fixedCostsCents;
}

export type PlanningScenario = {
  students: number;
  feeCents: number;
  perStudentCents: number;
  monthlyRevenueCents: number;
  monthlyMarginCents: number;
  yearlyMarginCents: number;
  coversFixedCosts: boolean;
  coversGoal: boolean;
};

export function evaluateScenario(students: number, feeCents: number, input: PlanningInput): PlanningScenario {
  const count = Math.floor(finiteNonNegative(students));
  const perStudent = effectiveRevenuePerStudentCents(feeCents, input);
  const margin = monthlyMarginCents(count, feeCents, input);
  return {
    students: count,
    feeCents: Math.round(finiteNonNegative(feeCents)),
    perStudentCents: perStudent,
    monthlyRevenueCents: Math.round(count * perStudent),
    monthlyMarginCents: margin,
    yearlyMarginCents: margin * 12,
    coversFixedCosts: marginAfterFixedCostsCents(count, feeCents, input) >= 0,
    coversGoal: margin >= 0
  };
}

/** Aplica os ajustes do modo "E se...?": delta de alunos (nunca abaixo de zero) e variação % da mensalidade. */
export function applyWhatIf(students: number, feeCents: number, studentsDelta: number, feeDeltaPercent: number) {
  return {
    students: Math.max(0, Math.floor(finiteNonNegative(students)) + Math.trunc(Number.isFinite(studentsDelta) ? studentsDelta : 0)),
    feeCents: Math.max(0, Math.round(finiteNonNegative(feeCents) * (1 + (Number.isFinite(feeDeltaPercent) ? feeDeltaPercent : 0) / 100)))
  };
}

/** Pontos para o gráfico: receita efetiva × alunos, com as linhas de custos fixos e de custos + pró-labore. */
export function buildRevenueCurve(feeCents: number, input: PlanningInput, maxStudents: number) {
  const clean = sanitizePlanningInput(input);
  const limit = Math.max(1, Math.floor(finiteNonNegative(maxStudents)));
  const step = Math.max(1, Math.ceil(limit / 24));
  const pointFor = (students: number) => ({
    students,
    revenueCents: Math.max(0, Math.round(students * effectiveRevenuePerStudentCents(feeCents, clean))),
    fixedCostsCents: clean.fixedCostsCents,
    needCents: monthlyNeedCents(clean)
  });
  const points: Array<ReturnType<typeof pointFor>> = [];
  for (let students = 0; students <= limit; students += step) points.push(pointFor(students));
  if (points.at(-1)?.students !== limit) points.push(pointFor(limit));
  return points;
}

function brl(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** Frase de leitura humana gerada pela regra. */
export function buildPlanningReading(students: number, feeCents: number, input: PlanningInput) {
  const clean = sanitizePlanningInput(input);
  const count = Math.floor(finiteNonNegative(students));
  if (count <= 0) return "Informe quantos alunos pagam mensalidade para ver a leitura do mês.";
  const perStudent = effectiveRevenuePerStudentCents(feeCents, clean);
  if (perStudent <= 0) return PLANNING_FAILURE_MESSAGES.loss_per_student;
  const margin = monthlyMarginCents(count, feeCents, clean);
  const base = `Com ${count} aluno${count === 1 ? "" : "s"} a ${brl(feeCents)}`;
  const breakEven = breakEvenStudents(feeCents, clean);
  const buffer = breakEven.ok ? Math.max(0, count - breakEven.value) : 0;
  if (margin >= 0) {
    const cushion = breakEven.ok
      ? buffer > 0
        ? ` Você aguenta perder até ${buffer} aluno${buffer === 1 ? "" : "s"} antes de faltar dinheiro para os custos fixos.`
        : " Atenção: você está no limite para cobrir os custos fixos, sem folga para perder alunos."
      : "";
    return `${base}, sobram ${brl(margin)} depois dos custos, do pró-labore e da reserva.${cushion}`;
  }
  const missing = requiredStudents(feeCents, clean);
  const hint = missing.ok ? ` Seriam necessários ${missing.value} alunos para fechar o mês.` : "";
  return `${base}, faltam ${brl(Math.abs(margin))} para cobrir custos, pró-labore e reserva.${hint}`;
}
