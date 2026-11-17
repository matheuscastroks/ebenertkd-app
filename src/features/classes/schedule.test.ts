import { describe, expect, it } from "vitest";
import { getNextClassSchedule, getTodayWeekday } from "./schedule";
import type { TrainingClass } from "./types";

const mockClass: TrainingClass = {
  $id: "class-1",
  $createdAt: "2026-01-01T00:00:00Z",
  $updatedAt: "2026-01-01T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "table",
  $sequence: "1",
  name: "Turma Infantil",
  weekdays: ["Terça", "Quinta"],
  start_time: "19:00",
  end_time: "20:00",
  location: "Dojô Central",
  capacity: 20,
  status: "active",
  created_by_account_id: "teacher-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("schedule helpers", () => {
  it("detects training when it is today and before end time", () => {
    // 2026-09-29 is a Tuesday. Set time to 15:00.
    const tuesdayAfternoon = new Date("2026-09-29T15:00:00-03:00");
    const next = getNextClassSchedule(mockClass, tuesdayAfternoon);

    expect(next).not.toBeNull();
    expect(next?.isToday).toBe(true);
    expect(next?.dayLabel).toBe("Hoje");
    expect(next?.startTime).toBe("19:00");
    expect(next?.endTime).toBe("20:00");
  });

  it("finds next training when class already ended today", () => {
    // 2026-09-29 is a Tuesday. Set time to 21:00 (after 20:00).
    const tuesdayNight = new Date("2026-09-29T21:00:00-03:00");
    const next = getNextClassSchedule(mockClass, tuesdayNight);

    expect(next).not.toBeNull();
    expect(next?.isToday).toBe(false);
    expect(next?.weekday).toBe("Quinta");
    expect(next?.startTime).toBe("19:00");
  });

  it("finds next day when today is not a training day", () => {
    // 2026-09-28 is a Monday.
    const monday = new Date("2026-09-28T12:00:00-03:00");
    const next = getNextClassSchedule(mockClass, monday);

    expect(next).not.toBeNull();
    expect(next?.isToday).toBe(false);
    expect(next?.dayLabel).toBe("Amanhã");
    expect(next?.weekday).toBe("Terça");
  });

  it("returns today weekday correctly", () => {
    // 2026-09-26 is a Saturday
    const saturday = new Date("2026-09-26T12:00:00-03:00");
    expect(getTodayWeekday(saturday)).toBe("Sábado");
  });
  it.each(["2026-09-30T00:00:00Z", "2026-09-30T02:59:59Z"])("usa o dia anterior em São Paulo antes de 03h UTC: %s", (instant) => {
    expect(getTodayWeekday(new Date(instant))).toBe("Terça");
  });
  it("troca o dia à meia-noite de São Paulo", () => {
    expect(getTodayWeekday(new Date("2026-09-30T03:00:00Z"))).toBe("Quarta");
  });
  it("compara horário da turma com São Paulo mesmo quando UTC já virou o dia", () => {
    const lateClass = { ...mockClass, start_time: "21:00", end_time: "23:00" };
    expect(getNextClassSchedule(lateClass, new Date("2026-09-30T01:00:00Z"))).toMatchObject({ isToday: true, weekday: "Terça", dayLabel: "Hoje" });
    expect(getNextClassSchedule(lateClass, new Date("2026-09-30T02:00:00Z"))).toMatchObject({ isToday: false, weekday: "Quinta" });
  });
  it("mantém amanhã e a próxima semana conforme calendário local", () => {
    const midnightClass = { ...mockClass, weekdays: ["Quarta"] as TrainingClass["weekdays"], start_time: "00:15", end_time: "01:00" };
    expect(getNextClassSchedule(midnightClass, new Date("2026-09-30T02:59:00Z"))).toMatchObject({ isToday: false, dayLabel: "Amanhã", weekday: "Quarta" });
    expect(getNextClassSchedule(midnightClass, new Date("2026-09-30T04:00:00Z"))).toMatchObject({ isToday: false, dayLabel: "Quarta-feira", weekday: "Quarta" });
  });
});