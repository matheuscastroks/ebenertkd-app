import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkInStudent: vi.fn(),
  justifyAbsence: vi.fn(),
  requireCapability: vi.fn(),
  revalidatePath: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/features/classes/check-in-service", async () => {
  class CheckInError extends Error {
    constructor(public readonly code: string, public readonly detail?: { distanceM: number; radiusM: number }) {
      super(code);
    }
  }
  return { CheckInError, checkInStudent: mocks.checkInStudent, justifyAbsence: mocks.justifyAbsence };
});

import { checkInAction, justifyAbsenceAction } from "@/app/actions/check-in";
import { CheckInError } from "@/features/classes/check-in-service";

const profile = { $id: "p1", role: "adult_student", capabilities: ["student"] };
const input = { date: "2026-11-20", startTime: "19:00", latitude: -23.5, longitude: -46.6 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCapability.mockResolvedValue(profile);
});

describe("checkInAction", () => {
  it("exige a capacidade de aluno e repassa o perfil logado ao serviço", async () => {
    mocks.checkInStudent.mockResolvedValue({ distanceM: 40 });
    const result = await checkInAction(input);
    expect(mocks.requireCapability).toHaveBeenCalledWith("student");
    expect(mocks.checkInStudent).toHaveBeenCalledWith(profile, input);
    expect(result).toEqual({ status: "success", message: "Presença confirmada. Você estava a cerca de 40 m do local." });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/aluno");
  });

  it("fora do raio devolve a distância e oferece justificar, sem revalidar", async () => {
    mocks.checkInStudent.mockRejectedValue(new CheckInError("check_in_out_of_range", { distanceM: 330, radiusM: 150 }));
    const result = await checkInAction(input);
    expect(result).toMatchObject({ status: "error", code: "check_in_out_of_range", offerJustify: true });
    expect(result.status === "error" && result.message).toContain("330 m");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("erro inesperado não registra a posição em log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.checkInStudent.mockRejectedValue(new Error("boom"));
    const result = await checkInAction(input);
    expect(result).toMatchObject({ status: "error", code: "unexpected" });
    expect(spy.mock.calls.flat().join(" ")).not.toContain("-23.5");
    spy.mockRestore();
  });
});

describe("justifyAbsenceAction", () => {
  it("justifica e revalida as telas do aluno", async () => {
    mocks.justifyAbsence.mockResolvedValue(undefined);
    const result = await justifyAbsenceAction({ date: "2026-11-20", startTime: "19:00", reason: "doente" });
    expect(mocks.justifyAbsence).toHaveBeenCalledWith(profile, { date: "2026-11-20", startTime: "19:00", reason: "doente" });
    expect(result.status).toBe("success");
  });

  it("registro já existente não é alterado pelo aluno", async () => {
    mocks.justifyAbsence.mockRejectedValue(new CheckInError("attendance_already_recorded"));
    expect(await justifyAbsenceAction({ date: "2026-11-20", startTime: "19:00", reason: "doente" })).toMatchObject({ status: "error", offerJustify: false });
  });
});
