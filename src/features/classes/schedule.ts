import type { TrainingClass, Weekday } from "@/features/classes/types";

export const DAY_INDEX_TO_WEEKDAY: Record<number, Weekday> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const WEEKDAY_TO_DAY_INDEX: Record<Weekday, number> = {
  Domingo: 0,
  Segunda: 1,
  Terça: 2,
  Quarta: 3,
  Quinta: 4,
  Sexta: 5,
  Sábado: 6,
};

const businessClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const weekdayIndices: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function localScheduleClock(now: Date) {
  const parts = Object.fromEntries(businessClock.formatToParts(now).map(({ type, value }) => [type, value]));
  return { dayIndex: weekdayIndices[parts.weekday], time: `${parts.hour}:${parts.minute}` };
}
export type NextClassSchedule = {
  isToday: boolean;
  dayLabel: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  location?: string | null;
  className: string;
};

/**
 * Retorna o próximo treino agendado para a turma com base no dia e hora atuais.
 */
export function getNextClassSchedule(
  trainingClass: TrainingClass,
  now = new Date()
): NextClassSchedule | null {
  if (!trainingClass.weekdays || trainingClass.weekdays.length === 0) {
    return null;
  }

  const { dayIndex: currentDayIndex, time: currentTime } = localScheduleClock(now);
  const currentWeekday = DAY_INDEX_TO_WEEKDAY[currentDayIndex];

  // 1. Verifica se hoje é dia de treino e se a aula ainda não terminou
  if (
    trainingClass.weekdays.includes(currentWeekday) &&
    currentTime < trainingClass.end_time
  ) {
    return {
      isToday: true,
      dayLabel: "Hoje",
      weekday: currentWeekday,
      startTime: trainingClass.start_time,
      endTime: trainingClass.end_time,
      location: trainingClass.location,
      className: trainingClass.name,
    };
  }

  // 2. Procura o próximo dia de treino nos próximos 7 dias
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayIndex = (currentDayIndex + offset) % 7;
    const nextWeekday = DAY_INDEX_TO_WEEKDAY[nextDayIndex];

    if (trainingClass.weekdays.includes(nextWeekday)) {
      let dayLabel = `${nextWeekday}-feira`;
      if (nextWeekday === "Sábado" || nextWeekday === "Domingo") {
        dayLabel = nextWeekday;
      }
      if (offset === 1) {
        dayLabel = "Amanhã";
      }

      return {
        isToday: false,
        dayLabel,
        weekday: nextWeekday,
        startTime: trainingClass.start_time,
        endTime: trainingClass.end_time,
        location: trainingClass.location,
        className: trainingClass.name,
      };
    }
  }

  return null;
}

/**
 * Retorna o dia da semana atual no padrão do aplicativo.
 */
export function getTodayWeekday(now = new Date()): Weekday {
  return DAY_INDEX_TO_WEEKDAY[localScheduleClock(now).dayIndex];
}
