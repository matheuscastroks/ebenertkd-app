const DAY_MS = 86400000;
const MAX_CATCH_UP_DAYS = 14;
const utc = (value) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

export const reminderStage = (due, day) => {
  const difference = Math.round((utc(day) - utc(due)) / DAY_MS);
  if (difference === -3) return "due_minus_3";
  if (difference === 0) return "due_today";
  if (difference === 3) return "overdue_plus_3";
  if (difference >= 10 && (difference - 3) % 7 === 0) return `overdue_weekly_${(difference - 3) / 7}`;
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
export const pendingReminder = (due, days, today) => {
  let latest = null;
  for (const day of days) {
    const stage = reminderStage(due, day);
    if (stage) latest = { stage, day };
  }
  if (!latest) return null;
  if (latest.day === today) return { stage: latest.stage, daysLeft: null };
  if (latest.stage === "due_today") return null;
  if (latest.stage === "due_minus_3") {
    const daysLeft = Math.round((utc(due) - utc(today)) / DAY_MS);
    return daysLeft > 0 ? { stage: latest.stage, daysLeft } : null;
  }
  return { stage: latest.stage, daysLeft: null };
};

export const reminderCopy = (stage, description, daysLeft = null) => {
  if (stage === "due_minus_3") {
    const left = daysLeft ?? 3;
    return { title: "Vencimento próximo", body: `${description} vence em ${left} ${left === 1 ? "dia" : "dias"}.` };
  }
  if (stage === "due_today") return { title: "Vencimento hoje", body: `${description} vence hoje.` };
  if (stage === "overdue_plus_3") return { title: "Pagamento em atraso", body: `${description} está em atraso há 3 dias.` };
  return { title: "Pagamento pendente", body: `${description} continua em atraso. Consulte os detalhes no aplicativo.` };
};

/** Dias cobertos em que o contrato estava a 30 ou 7 dias do fim (aviso de renovação). */
export const renewalReminderDays = (endsAt, days, today) => {
  if (Math.round((utc(endsAt) - utc(today)) / DAY_MS) < 0) return [];
  return days.flatMap((day) => {
    const left = Math.round((utc(endsAt) - utc(day)) / DAY_MS);
    return left === 30 || left === 7 ? [{ day, left }] : [];
  });
};
