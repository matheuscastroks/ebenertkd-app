import { describe, expect, it } from "vitest";
import { agendaMonthBounds, mergeAgendaTraining, nextAgendaTraining } from "./monthly-agenda-rules";
import type { UpcomingTrainingSession } from "./student-calendar-rules";
import type { AttendanceCalendarEntry } from "./types";

const session = (date: string, startTime = "18:00"): UpcomingTrainingSession => ({ id: `projected-${date}`, date, weekday: "Segunda", startTime, endTime: "19:00", className: "Adulto", classId: "class", location: "Dojang", kind: "regular" });
describe("agenda mensal", () => {
  it("delimita dezembro e fevereiro bissexto sem depender do fuso do navegador", () => {
    expect(agendaMonthBounds("2026-12")).toEqual({ firstDay: "2026-12-01", nextMonth: "2027-01-01", days: 31 });
    expect(agendaMonthBounds("2028-02").days).toBe(29);
  });
  it("substitui a projeção pela aula com registro de frequência", () => {
    const entries = [{ lesson: { $id: "lesson", training_class_id: "class", lesson_date: "2026-11-23T12:00:00Z", start_time: "18:00", end_time: "19:00", lesson_type: "regular", status: "completed" }, trainingClass: { name: "Adulto", location: "Dojang" }, record: { status: "present" } }] as AttendanceCalendarEntry[];
    const merged = mergeAgendaTraining([session("2026-11-23")], entries);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "lesson", status: "present" });
  });
  it("não interpreta ausência de chamada como falta", () => {
    expect(mergeAgendaTraining([session("2026-11-23")], [])[0].status).toBe("scheduled");
  });
  it("exclui treinos cancelados e encerrados da indicação do próximo treino", () => {
    const items = mergeAgendaTraining([session("2026-11-23"), session("2026-11-25"), session("2026-11-27")], []);
    items[1].status = "cancelled";
    expect(nextAgendaTraining(items, "2026-11-24T12:00:00Z")?.date).toBe("2026-11-27");
  });
});
