import { DEFAULT_NOTIFICATIONS_POLICY, type NotificationsPolicy } from "@/features/academy/defaults";

/**
 * Etapa de lembrete de pagamento. `due_minus_N` (N dias antes), `due_today`, `overdue_plus_N` (N dias de atraso) e
 * `overdue_weekly_K` (lembrete semanal). Com a régua padrão (-3, 0, +3, semanal a partir do dia 10) os nomes são os de sempre.
 * A Function `daily-operations` espelha estas regras (teste de paridade em `policy-parity.test.ts`).
 */
export type PaymentReminderStage = string;

export type PaymentReminderPolicy = Pick<NotificationsPolicy, "payment_stages" | "overdue_weekly_from_day">;

const DAY_MS = 86_400_000;
const utcDay = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export function paymentReminderStage(dueDate: string, referenceDate: string | Date, policy: PaymentReminderPolicy = DEFAULT_NOTIFICATIONS_POLICY): PaymentReminderStage | null {
  const daysFromDue = Math.round((utcDay(referenceDate) - utcDay(dueDate)) / DAY_MS);
  if (policy.payment_stages.includes(daysFromDue)) {
    if (daysFromDue < 0) return `due_minus_${-daysFromDue}`;
    if (daysFromDue === 0) return "due_today";
    return `overdue_plus_${daysFromDue}`;
  }
  const from = policy.overdue_weekly_from_day;
  if (daysFromDue >= from && (daysFromDue - from) % 7 === 0) return `overdue_weekly_${(daysFromDue - from) / 7 + 1}`;
  return null;
}

export function paymentReminderCopy(stage: PaymentReminderStage, description: string, daysLeft: number | null = null) {
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
}
