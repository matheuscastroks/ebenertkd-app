import { describe, expect, it } from "vitest";
import { eligibleLinks, lessonReadyToClose, missingAttendance, saoPauloDay } from "./attendance-consolidation.js";

const lesson = { $id: "l1", status: "open", lesson_date: "2026-11-19T12:00:00.000Z" };

describe("consolidação de faltas", () => {
  it("usa o dia de Brasília (a rotina roda às 00:15)", () => {
    expect(saoPauloDay(new Date("2026-11-20T03:15:00.000Z"))).toBe("2026-11-20");
    expect(saoPauloDay(new Date("2026-11-20T02:59:00.000Z"))).toBe("2026-11-19");
  });

  it("só fecha aulas abertas de dias anteriores", () => {
    expect(lessonReadyToClose(lesson, "2026-11-20")).toBe(true);
    expect(lessonReadyToClose(lesson, "2026-11-19")).toBe(false);
    expect(lessonReadyToClose({ ...lesson, status: "completed" }, "2026-11-20")).toBe(false);
    expect(lessonReadyToClose({ ...lesson, status: "cancelled" }, "2026-11-20")).toBe(false);
  });

  it("marca falta só para quem estava na turma e ficou sem registro", () => {
    const links = [
      { $id: "a", started_at: "2026-01-01T00:00:00.000Z" },
      { $id: "b", started_at: "2026-01-01T00:00:00.000Z" },
      { $id: "novo", started_at: "2026-11-20T00:00:00.000Z" },
      { $id: "saiu", started_at: "2026-01-01T00:00:00.000Z", ended_at: "2026-10-01T00:00:00.000Z" }
    ];
    expect(eligibleLinks(links, lesson.lesson_date).map((link) => link.$id)).toEqual(["a", "b"]);
    expect(missingAttendance(lesson, links, [{ class_enrollment_id: "a" }]).map((link) => link.$id)).toEqual(["b"]);
  });
});
