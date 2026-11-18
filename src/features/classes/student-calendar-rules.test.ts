import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  buildOutlookCalendarUrl,
  buildUpcomingTrainingSessions,
  buildWeeklyRRule,
  findFirstOccurrenceDate,
} from "@/features/classes/student-calendar-rules";
import type { Lesson, TrainingClass } from "@/features/classes/types";

const baseRow = {
  $sequence: "1",
  $createdAt: "2026-11-01T00:00:00Z",
  $updatedAt: "2026-11-01T00:00:00Z",
  $permissions: [],
  $databaseId: "db",
  $tableId: "tbl",
  created_by_account_id: "admin",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const trainingClass: TrainingClass = {
  ...baseRow,
  $id: "cls1",
  name: "Adulto Noite",
  weekdays: ["Quarta", "Sexta"],
  start_time: "19:30",
  end_time: "20:30",
  location: "Dojang principal",
  status: "active",
};

describe("student-calendar-rules", () => {
  it("projeta treinos regulares, inclui reposições e remove aulas canceladas", () => {
    const lessons: Lesson[] = [
      {
        ...baseRow,
        $id: "l-cancelled",
        training_class_id: "cls1",
        lesson_date: "2026-11-20T12:00:00Z", // Sexta cancelada
        start_time: "19:30",
        end_time: "20:30",
        lesson_type: "regular",
        status: "cancelled",
      },
      {
        ...baseRow,
        $id: "l-makeup",
        training_class_id: "cls1",
        lesson_date: "2026-11-21T12:00:00Z", // Sábado reposição
        start_time: "10:00",
        end_time: "11:00",
        lesson_type: "makeup",
        status: "open",
      },
    ];

    const sessions = buildUpcomingTrainingSessions({
      trainingClass,
      lessons,
      referenceDate: "2026-11-18", // Quarta
      horizonDays: 7,
    });

    expect(sessions.some((s) => s.date === "2026-11-18" && s.kind === "regular")).toBe(true);
    expect(sessions.some((s) => s.date === "2026-11-20")).toBe(false);
    expect(sessions.some((s) => s.date === "2026-11-21" && s.kind === "makeup")).toBe(true);
  });

  it("gera arquivo .ics RFC 5545 para treino com horário e para exame de dia inteiro", () => {
    const timed = buildIcsContent({
      uid: "s1",
      title: "Treino Adulto Noite",
      date: "2026-11-18",
      startTime: "19:30",
      endTime: "20:30",
      location: "Dojang principal",
    });
    expect(timed).toContain("BEGIN:VCALENDAR");
    expect(timed).toContain("DTSTART;TZID=America/Sao_Paulo:20261118T193000");
    expect(timed).toContain("DTEND;TZID=America/Sao_Paulo:20261118T203000");

    const fullDay = buildIcsContent({
      uid: "ex1",
      title: "Exame de Faixa",
      date: "2026-12-12",
    });
    expect(fullDay).toContain("DTSTART;VALUE=DATE:20261212");
    expect(fullDay).toContain("DTEND;VALUE=DATE:20261213");

    const recurring = buildIcsContent({
      uid: "rec1",
      title: "Treino Adulto Noite",
      date: "2026-11-18",
      startTime: "19:30",
      endTime: "20:30",
      recurrenceWeekdays: ["Sexta", "Quarta"],
    });
    expect(recurring).toContain("RRULE:FREQ=WEEKLY;BYDAY=WE,FR");
  });

  it("gera RRULE semanal ordenado e encontra a próxima data válida da grade", () => {
    expect(buildWeeklyRRule(["Sexta", "Segunda", "Quarta"])).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    expect(buildWeeklyRRule([])).toBeNull();
    // 2026-11-19 é quinta-feira; próxima aula de Segunda/Quarta/Sexta é 2026-11-20 (sexta)
    expect(findFirstOccurrenceDate(["Segunda", "Quarta", "Sexta"], "2026-11-19")).toBe("2026-11-20");
    // 2026-11-18 já é quarta-feira
    expect(findFirstOccurrenceDate(["Segunda", "Quarta", "Sexta"], "2026-11-18")).toBe("2026-11-18");
  });

  it("gera links diretos do Google Agenda e Outlook para treinos, recorrência e exames", () => {
    const googleRecurring = new URL(
      buildGoogleCalendarUrl({
        uid: "cls1",
        title: "Taekwondo · Adulto Noite",
        date: "2026-11-18",
        startTime: "19:30",
        endTime: "20:30",
        location: "Dojang principal",
        description: "Treino semanal",
        recurrenceWeekdays: ["Quarta", "Sexta"],
      })
    );
    expect(googleRecurring.origin + googleRecurring.pathname).toBe(
      "https://calendar.google.com/calendar/render"
    );
    expect(googleRecurring.searchParams.get("action")).toBe("TEMPLATE");
    expect(googleRecurring.searchParams.get("text")).toBe("Taekwondo · Adulto Noite");
    expect(googleRecurring.searchParams.get("dates")).toBe("20261118T193000/20261118T203000");
    expect(googleRecurring.searchParams.get("ctz")).toBe("America/Sao_Paulo");
    expect(googleRecurring.searchParams.get("recur")).toBe("RRULE:FREQ=WEEKLY;BYDAY=WE,FR");

    const googleAllDay = new URL(
      buildGoogleCalendarUrl({
        uid: "ex1",
        title: "Exame de Faixa",
        date: "2026-12-12",
      })
    );
    expect(googleAllDay.searchParams.get("dates")).toBe("20261212/20261213");
    expect(googleAllDay.searchParams.get("ctz")).toBeNull();

    const outlookTimed = new URL(
      buildOutlookCalendarUrl({
        uid: "s1",
        title: "Taekwondo · Adulto Noite",
        date: "2026-11-18",
        startTime: "19:30",
        endTime: "20:30",
        location: "Dojang principal",
        description: "Treino regular",
      })
    );
    expect(outlookTimed.origin + outlookTimed.pathname).toBe(
      "https://outlook.live.com/calendar/0/action/compose"
    );
    expect(outlookTimed.searchParams.get("rru")).toBe("addevent");
    expect(outlookTimed.searchParams.get("startdt")).toBe("2026-11-18T22:30:00Z");
    expect(outlookTimed.searchParams.get("enddt")).toBe("2026-11-18T23:30:00Z");

    const outlookAllDay = new URL(
      buildOutlookCalendarUrl({
        uid: "ex1",
        title: "Exame de Faixa",
        date: "2026-12-12",
      })
    );
    expect(outlookAllDay.searchParams.get("allday")).toBe("true");
    expect(outlookAllDay.searchParams.get("startdt")).toBe("2026-12-12");
    expect(outlookAllDay.searchParams.get("enddt")).toBe("2026-12-13");
  });
});
