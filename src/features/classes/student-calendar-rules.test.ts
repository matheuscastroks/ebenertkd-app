import { describe, expect, it } from "vitest";
import {
  buildIcsContent,
  buildUpcomingTrainingSessions,
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
  });
});
