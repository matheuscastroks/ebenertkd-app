import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentCheckInState } from "@/features/classes/check-in-service";

const mocks = vi.hoisted(() => ({ checkIn: vi.fn(), justify: vi.fn(), refresh: vi.fn(), position: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/actions/check-in", () => ({ checkInAction: mocks.checkIn, justifyAbsenceAction: mocks.justify }));

import { CheckInCard } from "./check-in-card";

const state: StudentCheckInState = {
  slot: { date: "2026-11-20", startTime: "19:00", endTime: "20:30" },
  className: "Turma de teste",
  location: "Dojang",
  phase: "open",
  opensAt: "2026-11-20T21:45:00.000Z",
  closesAt: "2026-11-20T22:30:00.000Z",
  placeConfigured: true,
  record: null
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-20T22:00:00.000Z"));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: mocks.position } });
});

afterEach(() => vi.restoreAllMocks());

describe("CheckInCard", () => {
  it("oferece justificativa quando o GPS é negado sem enviar presença", async () => {
    mocks.position.mockImplementation((_success, failure) => failure({ code: 1 }));
    render(<CheckInCard state={state} />);
    fireEvent.click(screen.getByRole("button", { name: "Fazer check-in" }));
    expect(await screen.findByText(/O acesso à localização foi negado/)).toBeInTheDocument();
    expect(mocks.checkIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Justificar falta" }));
    expect(screen.getByLabelText("Motivo da falta")).toBeVisible();
  });

  it("mostra a recusa fora do raio e permite tentar de novo", async () => {
    mocks.position.mockImplementation((success) => success({ coords: { latitude: 1, longitude: 2 } }));
    mocks.checkIn.mockResolvedValue({ status: "error", code: "check_in_out_of_range", message: "Fora do raio do local", offerJustify: true });
    render(<CheckInCard state={state} />);
    fireEvent.click(screen.getByRole("button", { name: "Fazer check-in" }));
    expect(await screen.findByText("Fora do raio do local")).toBeVisible();
    expect(await screen.findByRole("button", { name: "Fazer check-in" })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("atualiza o card após confirmação sem expor a posição na tela", async () => {
    mocks.position.mockImplementation((success) => success({ coords: { latitude: 1.23456, longitude: 2.34567 } }));
    mocks.checkIn.mockResolvedValue({ status: "success", message: "Presença confirmada" });
    render(<CheckInCard state={state} />);
    fireEvent.click(screen.getByRole("button", { name: "Fazer check-in" }));
    expect(await screen.findByText("Presença confirmada")).toBeVisible();
    expect(mocks.checkIn).toHaveBeenCalledWith({ date: "2026-11-20", startTime: "19:00", latitude: 1.23456, longitude: 2.34567 });
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByText(/1\.23456|2\.34567/)).not.toBeInTheDocument();
  });

  it("envia o motivo da falta e atualiza o card sem solicitar GPS", async () => {
    mocks.justify.mockResolvedValue({ status: "success", message: "Falta justificada" });
    render(<CheckInCard state={state} />);
    fireEvent.click(screen.getByRole("button", { name: "Justificar falta" }));
    fireEvent.change(screen.getByLabelText("Motivo da falta"), { target: { value: "Consulta médica" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar justificativa" }));
    await waitFor(() => expect(mocks.justify).toHaveBeenCalledWith({ date: "2026-11-20", startTime: "19:00", reason: "Consulta médica" }));
    expect(await screen.findByText("Falta justificada")).toBeVisible();
    expect(mocks.position).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("registro existente mostra o motivo e impede novas ações do aluno", () => {
    render(<CheckInCard state={{ ...state, record: { status: "excused", source: "justification", justification: "Consulta médica" } }} />);
    expect(screen.getByText("Motivo: Consulta médica")).toBeVisible();
    expect(screen.getByText("Só o professor pode alterar este registro.")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
