/**
 * Regras puras do reajuste de mensalidade. Valores em centavos; datas como "AAAA-MM-DD".
 * O reajuste nunca altera contratos assinados: ele muda a mensalidade da matrícula e passa a
 * valer na próxima renovação (ou na vigência escolhida, o que ocorrer por último).
 */

export type AdjustmentMode = "percent" | "fixed" | "rounded";

export type AdjustmentConfig = {
  mode: AdjustmentMode;
  /** Percentual (ex.: 4.5). Usado em "percent" e como base do "rounded". */
  percent: number;
  /** Novo valor fixo em centavos (modo "fixed"). */
  fixedCents: number;
  /** Múltiplo de arredondamento em centavos (modo "rounded"), ex.: 500 ou 1000. */
  roundToCents: number;
};

export type AdjustmentStudent = {
  enrollmentId: string;
  studentId: string;
  /** Mensalidade-base da matrícula (antes do desconto). */
  currentFeeCents: number;
  /** Desconto em reais, mantido após o reajuste. */
  discountCents: number;
  /** Fim do contrato vigente ("AAAA-MM-DD") ou null. */
  contractEnd: string | null;
};

export type AdjustmentRow = AdjustmentStudent & {
  newFeeCents: number;
  /** Diferença paga pelo aluno por mês (já considera o desconto mantido). */
  diffCents: number;
  excluded: boolean;
  /** Valor manual digitado pelo professor para este aluno. */
  manual: boolean;
  /** Data a partir da qual o novo valor passa a ser cobrado (renovação após a vigência). */
  appliedFrom: string;
};

export const MIN_NOTICE_DAYS = 30;

const DAY_MS = 86_400_000;

function toUtc(day: string) {
  const [year, month, date] = day.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, date);
}

function fromUtc(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number) {
  return fromUtc(toUtc(day) + days * DAY_MS);
}

export function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

function positive(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Valor líquido que o aluno paga: mensalidade-base menos o desconto fixo em reais. */
export function netFeeCents(feeCents: number, discountCents: number) {
  return Math.max(0, Math.round(positive(feeCents)) - Math.round(positive(discountCents)));
}

/** Novo valor-base conforme o modo. O desconto não entra no cálculo: continua em reais. */
export function computeNewFeeCents(currentFeeCents: number, config: AdjustmentConfig) {
  const current = Math.round(positive(currentFeeCents));
  if (config.mode === "fixed") return Math.round(positive(config.fixedCents));
  const raised = current * (1 + positive(config.percent) / 100);
  if (config.mode === "percent") return Math.round(raised);
  const step = Math.round(positive(config.roundToCents));
  if (step <= 0) return Math.round(raised);
  // Arredonda para cima ao múltiplo; evita que o arredondamento reduza o valor atual.
  return Math.max(current, Math.ceil(Math.round(raised) / step) * step);
}

/** Data em que o novo valor passa a ser cobrado: dia seguinte ao fim do contrato, nunca antes da vigência. */
export function appliedFromDate(contractEnd: string | null, effectiveFrom: string) {
  if (!contractEnd) return effectiveFrom;
  const renewal = addDays(contractEnd, 1);
  return renewal > effectiveFrom ? renewal : effectiveFrom;
}

export function buildAdjustmentRows(
  students: AdjustmentStudent[],
  config: AdjustmentConfig,
  effectiveFrom: string,
  overrides: { excluded?: ReadonlySet<string>; manualFeeCents?: Readonly<Record<string, number>> } = {}
): AdjustmentRow[] {
  return students.map((student) => {
    const manualFee = overrides.manualFeeCents?.[student.enrollmentId];
    const manual = manualFee !== undefined && Number.isFinite(manualFee) && manualFee > 0;
    const newFeeCents = manual ? Math.round(manualFee) : computeNewFeeCents(student.currentFeeCents, config);
    return {
      ...student,
      newFeeCents,
      diffCents: netFeeCents(newFeeCents, student.discountCents) - netFeeCents(student.currentFeeCents, student.discountCents),
      excluded: overrides.excluded?.has(student.enrollmentId) ?? false,
      manual,
      appliedFrom: appliedFromDate(student.contractEnd, effectiveFrom)
    };
  });
}

export type AdjustmentImpact = {
  affectedCount: number;
  /** Ganho mensal quando todos os contratos estiverem renovados. */
  monthlyGainCents: number;
  /** Ganho dos próximos 12 meses conforme cada renovação entra. */
  firstYearGainCents: number;
  /** Ganho anual em regime (12 × ganho mensal). */
  annualGainCents: number;
  averageNewFeeCents: number;
  /** Máximo de saídas em que o reajuste ainda compensa: floor(ganho mensal / novo valor médio). */
  maxDepartures: number;
  curve: Array<{ month: string; gainCents: number; renewedCount: number }>;
};

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Impacto financeiro: considera só linhas não excluídas. A curva começa no mês de `today`. */
export function computeAdjustmentImpact(rows: AdjustmentRow[], today: string): AdjustmentImpact {
  const active = rows.filter((row) => !row.excluded);
  const monthlyGainCents = active.reduce((sum, row) => sum + row.diffCents, 0);
  const startMonth = today.slice(0, 7);
  const curve = Array.from({ length: 12 }, (_, index) => {
    const month = shiftMonth(startMonth, index);
    const renewed = active.filter((row) => row.appliedFrom.slice(0, 7) <= month);
    return { month, gainCents: renewed.reduce((sum, row) => sum + row.diffCents, 0), renewedCount: renewed.length };
  });
  const averageNewFeeCents = active.length
    ? Math.round(active.reduce((sum, row) => sum + netFeeCents(row.newFeeCents, row.discountCents), 0) / active.length)
    : 0;
  return {
    affectedCount: active.length,
    monthlyGainCents,
    firstYearGainCents: curve.reduce((sum, point) => sum + point.gainCents, 0),
    annualGainCents: monthlyGainCents * 12,
    averageNewFeeCents,
    maxDepartures: maxTolerableDepartures(monthlyGainCents, averageNewFeeCents),
    curve
  };
}

/** alunosQuePodemSair = floor(ganhoMensal / novoValorMédio); zero quando não há ganho. */
export function maxTolerableDepartures(monthlyGainCents: number, averageNewFeeCents: number) {
  if (!(monthlyGainCents > 0) || !(averageNewFeeCents > 0)) return 0;
  return Math.floor(monthlyGainCents / averageNewFeeCents);
}

/** Quanto do ganho sobra se `departures` alunos saírem (receita média perdida por saída). */
export function gainAfterDepartures(monthlyGainCents: number, averageNewFeeCents: number, departures: number) {
  return monthlyGainCents - Math.max(0, Math.floor(departures)) * Math.max(0, averageNewFeeCents);
}

/** Percentual da meta coberto pelo ganho mensal (null sem meta). */
export function goalCoveragePercent(monthlyGainCents: number, goalCents: number) {
  if (!(goalCents > 0)) return null;
  return Math.max(0, Math.round((monthlyGainCents / goalCents) * 100));
}

/** Menor data de vigência com aviso mínimo: primeiro dia de mês que seja ≥ hoje + antecedência. */
export function defaultEffectiveFrom(today: string, minNoticeDays = MIN_NOTICE_DAYS) {
  const earliest = addDays(today, minNoticeDays);
  if (earliest.endsWith("-01")) return earliest;
  return `${shiftMonth(earliest.slice(0, 7), 1)}-01`;
}

export type NoticeCheck = { daysOfNotice: number; short: boolean; message: string | null };

/** Antecedência entre hoje e a vigência. Abaixo do mínimo gera aviso, sem bloquear. */
export function checkNotice(today: string, effectiveFrom: string, minNoticeDays = MIN_NOTICE_DAYS): NoticeCheck {
  const daysOfNotice = daysBetween(today, effectiveFrom);
  const short = daysOfNotice < minNoticeDays;
  return {
    daysOfNotice,
    short,
    message: short
      ? `Atenção: restam ${Math.max(0, daysOfNotice)} dia${Math.abs(daysOfNotice) === 1 ? "" : "s"} até a vigência, menos do que os ${minNoticeDays} dias recomendados de aviso. Você pode continuar, mas considere avisar com mais antecedência.`
      : null
  };
}
