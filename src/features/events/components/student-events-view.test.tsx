import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Event, EventOption, EventRegistration } from "@/features/events/types";
import type { StudentEventEntry, StudentOpenEvent } from "@/features/events/student-events-service";

vi.mock("@/app/actions/championships", () => ({
  updateWeightAction: vi.fn(),
  uploadRegistrationDocumentAction: vi.fn()
}));
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

describe("campeonato na tela do aluno e do responsável", () => {
  const championship = { ...event, $id: "ch", event_type: "championship", title: "Estadual", organizer_name: "Federação Estadual", audience: "students" } as Event;
  const deadline = { $id: "dl", event_id: "ch", kind: "weigh_in", label: "Pesagem", due_at: FUTURE } as never;
  const option2 = { $id: "opt2", event_id: "ch", label: "Kyorugi Adulto Masc. -68 kg", price_cents: 6000, federation_fee_cents: 12000 } as EventOption;
  const openChampionship = (extra: Partial<StudentOpenEvent> = {}): StudentOpenEvent => ({ event: championship, registrationState: "open", seatsLeft: null, options: [{ option: option2, eligible: true, reasons: [], seatsLeft: null, weightRange: { minGrams: 58000, maxGrams: 68000 } }], deadlines: [deadline], ...extra });
  const entry = (registration: Partial<EventRegistration>, extra: Partial<StudentEventEntry> = {}) =>
    ({ registration: { $id: "reg", status: "interested", companions: 0, option_id: "opt2", declared_weight_grams: 66000, ...registration } as EventRegistration, event: championship, option: option2, charge: null, documents: [], ...extra }) as StudentEventEntry;

  it("mostra organizador, prazos e o botão para manifestar interesse, com o valor somado das duas taxas", () => {
    render(<StudentEventsView {...base} open={[openChampionship()]} />);
    expect(screen.getByText("Estadual")).toBeTruthy();
    expect(screen.getByText(/Organização: Federação Estadual/)).toBeTruthy();
    expect(screen.getByText(/Pesagem:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quero competir" })).toBeTruthy();
    expect(screen.getByText(/R\$\s*180,00/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Inscrever convidado" })).toBeNull();
  });

  it("menor só manifesta interesse e não vê valores", () => {
    render(<StudentEventsView {...base} viewer={{ kind: "minor" }} showFinancial={false} open={[openChampionship()]} />);
    expect(screen.getByRole("button", { name: "Tenho interesse" })).toBeTruthy();
    expect(screen.queryByText(/R\$/)).toBeNull();
  });

  it("responsável autoriza o interesse do dependente; sem enviar documentos o menor só acompanha", () => {
    const upcoming = [entry({})];
    const { unmount } = render(<StudentEventsView {...base} viewer={{ kind: "guardian", dependentName: "Ana" }} upcoming={upcoming} />);
    expect(screen.getByRole("button", { name: "Autorizar participação" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar vaga" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enviar documento" })).toBeTruthy();
    unmount();
    render(<StudentEventsView {...base} viewer={{ kind: "minor" }} showFinancial={false} upcoming={upcoming} />);
    expect(screen.getByText("Aguardando a autorização do responsável.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar documento" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Autorizar participação" })).toBeNull();
  });

  it("mostra andamento, cobranças separadas, documento em análise e fecha o peso depois do prazo", () => {
    const charge = (id: string, amount: number) => ({ $id: id, amount_cents: amount, status: "pending" }) as never;
    const confirmed = entry({ status: "confirmed", guardian_authorized_at: "2026-01-01", external_submitted_at: "2026-01-02" }, { charge: charge("c1", 6000), federationCharge: charge("c2", 12000), weightLocked: true, documents: [{ $id: "d1", kind: "medical", status: "pending" } as never] });
    render(<StudentEventsView {...base} upcoming={[confirmed]} />);
    expect(screen.getByText("3. Enviado à federação")).toBeTruthy();
    expect(screen.getByText(/Academia:/)).toBeTruthy();
    expect(screen.getByText(/Federação:/)).toBeTruthy();
    expect(screen.getByText("Atestado médico")).toBeTruthy();
    expect(screen.getByText("Em análise")).toBeTruthy();
    expect(screen.getByText(/fechado para alterações/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Corrigir peso" })).toBeNull();
  });

  it("mostra a medalha no histórico", () => {
    const past = entry({ status: "completed" }, { result: { medal: "gold", placement: 1 } as never });
    render(<StudentEventsView {...base} past={[past]} />);
    expect(screen.getByText("Medalha de ouro")).toBeTruthy();
    expect(screen.getByText("1º lugar")).toBeTruthy();
  });
});
