import { describe, expect, it } from "vitest";
import { attendanceSourceNote, checkInErrorMessage, geolocationErrorMessage } from "@/features/classes/check-in-labels";

describe("nota da chamada do professor", () => {
  it("descreve check-in, justificativa e falta automática", () => {
    expect(attendanceSourceNote({ status: "present", source: "check_in", check_in_distance_m: 40 })).toBe("Check-in pelo app · 40 m do local");
    expect(attendanceSourceNote({ status: "excused", source: "justification", justification: "consulta" })).toBe("Justificou: consulta");
    expect(attendanceSourceNote({ status: "absent", source: "auto" })).toBe("Falta automática: sem check-in nem justificativa");
  });

  it("some quando o professor mudou o registro ou não há registro", () => {
    expect(attendanceSourceNote({ status: "absent", source: "admin" })).toBeNull();
    expect(attendanceSourceNote({ status: "absent", source: "check_in" })).toBeNull();
    expect(attendanceSourceNote(undefined)).toBeNull();
  });
});

describe("mensagens ao aluno", () => {
  it("permissão negada explica o caminho e sugere justificar", () => {
    expect(geolocationErrorMessage(1)).toMatch(/negado.*Justificar/);
  });

  it("fora do raio mostra distância e limite", () => {
    expect(checkInErrorMessage("check_in_out_of_range", { distanceM: 330, radiusM: 150 })).toMatchObject({ offerJustify: true, message: expect.stringContaining("330 m do local do treino (limite de 150 m)") });
  });
});
