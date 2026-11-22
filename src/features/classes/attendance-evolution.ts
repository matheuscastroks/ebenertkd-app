import type { AttendanceCalendarEntry } from "./types";
import type { AttendanceEvolutionPoint } from "./components/attendance-chart";

const statusLabels = { present: "Presente", absent: "Falta", excused: "Justificada" };

export function buildAttendanceEvolution(entries: AttendanceCalendarEntry[]): AttendanceEvolutionPoint[] {
  const recorded = [...entries]
    .filter((entry) => entry.lesson.status !== "cancelled" && entry.record)
    .sort((a, b) =>
      `${a.lesson.lesson_date}:${a.lesson.start_time}`.localeCompare(
        `${b.lesson.lesson_date}:${b.lesson.start_time}`
      )
    );

  const dayTotals = new Map<string, number>();
  for (const entry of recorded) {
    const day = entry.lesson.lesson_date.slice(0, 10);
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + 1);
  }

  let attended = 0;
  let total = 0;
  const points: AttendanceEvolutionPoint[] = [];
  for (const entry of recorded) {
    total += 1;
    if (entry.record!.status === "present") attended += 1;
    const isoDay = entry.lesson.lesson_date.slice(0, 10);
    const [, monthPart, dayPart] = isoDay.split("-");
    const shortDay = `${dayPart}/${monthPart}`;
    const dateLabel =
      (dayTotals.get(isoDay) ?? 0) > 1
        ? `${shortDay} ${entry.lesson.start_time}`
        : shortDay;
    points.push({
      dateLabel,
      lessonLabel: entry.trainingClass?.name ?? "Treino regular",
      rate: Math.round((attended / total) * 100),
      attended,
      total,
      statusLabel: statusLabels[entry.record!.status]
    });
  }
  return points;
}

