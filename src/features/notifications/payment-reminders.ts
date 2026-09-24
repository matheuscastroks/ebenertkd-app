export type PaymentReminderStage = "due_minus_3" | "due_today" | "overdue_plus_3" | `overdue_weekly_${number}`;

const DAY_MS = 86_400_000;
const utcDay = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export function paymentReminderStage(dueDate: string, referenceDate: string | Date): PaymentReminderStage | null {
  const daysFromDue = Math.round((utcDay(referenceDate) - utcDay(dueDate)) / DAY_MS);
  if (daysFromDue === -3) return "due_minus_3";
  if (daysFromDue === 0) return "due_today";
  if (daysFromDue === 3) return "overdue_plus_3";
  if (daysFromDue >= 10 && (daysFromDue - 3) % 7 === 0) return `overdue_weekly_${(daysFromDue - 3) / 7}`;
  return null;
}

export function paymentReminderCopy(stage: PaymentReminderStage, description: string) {
  if (stage === "due_minus_3") return { title: "Vencimento próximo", body: `${description} vence em 3 dias.` };
  if (stage === "due_today") return { title: "Vencimento hoje", body: `${description} vence hoje.` };
  if (stage === "overdue_plus_3") return { title: "Pagamento em atraso", body: `${description} está em atraso há 3 dias.` };
  return { title: "Pagamento pendente", body: `${description} continua em atraso. Consulte os detalhes no aplicativo.` };
}
