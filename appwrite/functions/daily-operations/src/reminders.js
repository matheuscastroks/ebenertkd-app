import { DEFAULT_POLICIES } from "./policy-defaults.js";

const DAY_MS = 86400000;
const MAX_CATCH_UP_DAYS = 14;
const utc = (value) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Etapa do lembrete de pagamento pela régua da academia (`notifications.payment_stages`: dias em relação ao vencimento,
 * negativo = antes) mais o lembrete semanal a partir de `overdue_weekly_from_day`. Com a régua padrão: -3, 0, +3 e semanal
 * a partir do dia 10, com os mesmos nomes de sempre.
 */
export const reminderStage = (due, day, policy = DEFAULT_POLICIES.notifications) => {
  const difference = Math.round((utc(day) - utc(due)) / DAY_MS);
  if (policy.payment_stages.includes(difference)) {
    if (difference < 0) return `due_minus_${-difference}`;
    if (difference === 0) return "due_today";
    return `overdue_plus_${difference}`;
  }
  const from = policy.overdue_weekly_from_day;
  if (difference >= from && (difference - from) % 7 === 0) return `overdue_weekly_${(difference - from) / 7 + 1}`;
  return null;
};

/**
 * Dias que esta execução precisa cobrir: do dia seguinte à última execução
 * concluída até hoje, no máximo 14 dias. Sem execução anterior (ou rodando de
 * novo no mesmo dia), cobre só hoje.
 */
export const processingDays = (lastRunDay, today) => {
  if (!lastRunDay || utc(lastRunDay) >= utc(today)) return [today];
  const start = Math.max(utc(lastRunDay) + DAY_MS, utc(today) - (MAX_CATCH_UP_DAYS - 1) * DAY_MS);
  const days = [];
  for (let ms = start; ms <= utc(today); ms += DAY_MS) days.push(isoDay(ms));
  return days;
};

/**
 * Lembrete a enviar para uma cobrança, olhando todos os dias cobertos. Só o mais
 * recente conta, para o responsável não receber vários avisos de uma vez, e só se
 * o texto ainda for verdadeiro hoje: "vence hoje" atrasado vira silêncio, porque
 * o aviso de atraso chega em seguida.
 */
export const pendingReminder = (due, days, today, policy = DEFAULT_POLICIES.notifications) => {
  let latest = null;
  for (const day of days) {
    const stage = reminderStage(due, day, policy);
    if (stage) latest = { stage, day };
  }
  if (!latest) return null;
  if (latest.day === today) return { stage: latest.stage, daysLeft: null };
  if (latest.stage === "due_today") return null;
  if (latest.stage.startsWith("due_minus_")) {
    const daysLeft = Math.round((utc(due) - utc(today)) / DAY_MS);
    return daysLeft > 0 ? { stage: latest.stage, daysLeft } : null;
  }
  return { stage: latest.stage, daysLeft: null };
};

export const reminderCopy = (stage, description, daysLeft = null) => {
  const before = /^due_minus_(\d+)$/.exec(stage);
  if (before) {
    const left = daysLeft ?? Number(before[1]);
    return { title: "Vencimento próximo", body: `${description} vence em ${left} ${left === 1 ? "dia" : "dias"}.` };
  }
  if (stage === "due_today") return { title: "Vencimento hoje", body: `${description} vence hoje.` };
  const after = /^overdue_plus_(\d+)$/.exec(stage);
  if (after) {
    const days = Number(after[1]);
    return { title: "Pagamento em atraso", body: `${description} está em atraso há ${days} ${days === 1 ? "dia" : "dias"}.` };
  }
  return { title: "Pagamento pendente", body: `${description} continua em atraso. Consulte os detalhes no aplicativo.` };
};

/** Dias cobertos em que o contrato estava a um dos `contract.renewal_reminder_days` do fim (padrão 30 e 7; aviso de renovação). */
export const renewalReminderDays = (endsAt, days, today, reminderDays = DEFAULT_POLICIES.contract.renewal_reminder_days) => {
  if (Math.round((utc(endsAt) - utc(today)) / DAY_MS) < 0) return [];
  return days.flatMap((day) => {
    const left = Math.round((utc(endsAt) - utc(day)) / DAY_MS);
    return reminderDays.includes(left) ? [{ day, left }] : [];
  });
};

/** A mensalidade de uma competência passa a ser gerada `billing.charge_lead_days` (padrão 7) antes do dia 1. */
export const shouldGenerate = (competence, day, leadDays = DEFAULT_POLICIES.billing.charge_lead_days) =>
  utc(day) >= utc(`${competence}-01`) - leadDays * DAY_MS;

/** Vencimento do PAR-Q: data da assinatura + `compliance.parq_validity_days` (a validade é regra atual da academia). */
export const parqExpiryDay = (signedAt, validityDays = DEFAULT_POLICIES.compliance.parq_validity_days) => isoDay(utc(signedAt) + validityDays * DAY_MS);

/** Etapa do lembrete de PAR-Q para os dias que faltam: 0 = venceu hoje ("expired"), demais = "Nd". `null` fora dos dias da política. */
export const parqReminderStage = (daysLeft, reminderDays = DEFAULT_POLICIES.compliance.parq_reminder_days) =>
  reminderDays.includes(daysLeft) ? (daysLeft === 0 ? "expired" : `${daysLeft}d`) : null;
