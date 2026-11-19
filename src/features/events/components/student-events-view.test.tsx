import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Event, EventOption, EventRegistration } from "@/features/events/types";
import type { StudentEventEntry, StudentOpenEvent } from "@/features/events/student-events-service";

vi.mock("@/app/actions/events", () => ({
  registerForEventAction: vi.fn(),
  cancelRegistrationAction: vi.fn(),
  rejectRegistrationAction: vi.fn(),
  confirmInterestAction: vi.fn()
}));

import { StudentEventsView } from "./student-events-view";

const FUTURE = new Date(Date.now() + 5 * 86400_000).toISOString();
const event = { $id: "ev", event_type: "seminar", title: "Aulão de chutes", status: "registration_open", starts_at: FUTURE, audience: "students", location_text: "Dojang", max_companions: 0 } as Event;
const option = { $id: "opt", event_id: "ev", label: "Participante", price_cents: 3000 } as EventOption;
const openItem = (seatsLeft: number | null, mine?: EventRegistration): StudentOpenEvent => ({
  event,
  registrationState: "open",
  seatsLeft,
  options: [{ option, eligible: true, reasons: [], seatsLeft, mine }]
});
const interestedEntry = { registration: { $id: "reg", status: "interested", companions: 0, option_id: "opt" } as EventRegistration, event, option, charge: null } as StudentEventEntry;

const base = { hasStudent: true, studentProfileId: "p1", returnTo: "/aluno/eventos", billingHref: "/aluno/financeiro", examsHref: "/aluno/exames", showFinancial: true, viewer: { kind: "self" as const }, open: [] as StudentOpenEvent[], upcoming: [] as StudentEventEntry[], past: [] as StudentEventEntry[] };

describe("StudentEventsView", () => {
  it("mostra o estado vazio explicando o que aparece aqui", () => {
    render(<StudentEventsView {...base} />);
    expect(screen.getByText("Nenhum evento no momento")).toBeTruthy();
    expect(screen.getByText("Nenhuma inscrição ativa.")).toBeTruthy();
  });

  it("lista o evento aberto com preço, vagas e botão de inscrição", () => {
    render(<StudentEventsView {...base} open={[openItem(12)]} />);
    expect(screen.getByText("Aulão de chutes")).toBeTruthy();
    expect(screen.getByText(/12 vagas restantes/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inscrever-se" })).toBeTruthy();
  });

  it("lotado oferece a lista de espera", () => {
    render(<StudentEventsView {...base} open={[openItem(0)]} />);
    expect(screen.getByRole("button", { name: "Entrar na lista de espera" })).toBeTruthy();
  });

  it("menor só manifesta interesse e não vê valores", () => {
    render(<StudentEventsView {...base} viewer={{ kind: "minor" }} showFinancial={false} open={[openItem(5)]} />);
    expect(screen.getByRole("button", { name: "Tenho interesse" })).toBeTruthy();
    expect(screen.queryByText(/R\$/)).toBeNull();
  });

  it("responsável confirma o interesse do dependente", () => {
    render(<StudentEventsView {...base} viewer={{ kind: "guardian", dependentName: "Ana" }} upcoming={[interestedEntry]} />);
    expect(screen.getByRole("button", { name: "Confirmar vaga" })).toBeTruthy();
  });

  it("quem já está inscrito não vê o botão de inscrição", () => {
    render(<StudentEventsView {...base} open={[openItem(5, { $id: "reg" } as EventRegistration)]} />);
    expect(screen.getByText("Você já está inscrito")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Inscrever-se" })).toBeNull();
  });
});
