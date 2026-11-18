import type { NextClassSchedule } from "@/features/classes/schedule";

/** "Hoje, 19:00 às 20:00" — a frase que responde "quando é o treino?". */
export function formatNextTraining(next: NextClassSchedule | null) {
  return next ? `${next.isToday ? "Hoje" : next.dayLabel}, ${next.startTime} às ${next.endTime}` : "Horário ainda não definido";
}
