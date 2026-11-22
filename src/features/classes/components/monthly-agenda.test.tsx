import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthlyAgenda, type MonthlyAgendaProps } from "./monthly-agenda";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./attendance-chart", () => ({ StudentAttendanceChart: () => null, AttendanceEvolutionAreaChart: () => null }));

const props: MonthlyAgendaProps = {
  month: "2026-11", today: "2026-11-21", now: "2026-11-21T12:00:00Z",
  trainingClass: null,
  training: [
    { id: "one", date: "2026-11-23", weekday: "Segunda", startTime: "18:00", endTime: "19:00", className: "Adulto", location: "Dojang", kind: "regular", status: "scheduled" },
    { id: "two", date: "2026-11-25", weekday: "Quarta", startTime: "18:00", endTime: "19:00", className: "Adulto", location: "Dojang", kind: "regular", status: "scheduled" }
  ],
  events: [{ id: "exam", date: "2026-11-28", startsAt: "2026-11-28T12:00:00Z", name: "Exame semestral", location: "Dojang", description: "Comparecer de uniforme.", type: "belt_exam", status: "published" }],
  frequency: { attended: 0, total: 0, rate: 0, absent: 0, excused: 0, points: [] }
};

beforeEach(() => push.mockClear());
describe("MonthlyAgenda", () => {
  it("mostra apenas o próximo treino e os eventos na visão mensal", () => {
    render(<MonthlyAgenda {...props} />);
    expect(screen.getAllByText("Adulto")).toHaveLength(1);
    const events = screen.getByRole("list", { name: "Eventos do mês" });
    expect(within(events).getByRole("button", { name: "Exame semestral, dia 28" })).toBeInTheDocument();
    expect(within(events).queryByText("Adulto")).not.toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
  });

  it("mostra os detalhes do dia e permite voltar à visão do mês", async () => {
    const user = userEvent.setup();
    render(<MonthlyAgenda {...props} />);
    await user.click(screen.getByRole("button", { name: "Exame semestral, dia 28" }));
    expect(screen.getByText("Comparecer de uniforme.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver exames de faixa" })).toHaveAttribute("href", "/aluno/exames");
    await user.click(screen.getByRole("button", { name: "Visão do mês" }));
    expect(screen.getByRole("list", { name: "Eventos do mês" })).toBeInTheDocument();
  });

  it("seleciona uma data no calendário e mostra a frequência registrada", async () => {
    const user = userEvent.setup();
    const { container } = render(<MonthlyAgenda {...props} training={[{ ...props.training[0], status: "present" }]} />);
    const day = container.querySelector<HTMLButtonElement>('button[data-date="2026-11-23"]')!;
    await user.click(day);
    expect(screen.getByText("Presente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar treino" })).not.toBeInTheDocument();
  });

  it("navega por mês mantendo o endereço compartilhável", async () => {
    const user = userEvent.setup();
    render(<MonthlyAgenda {...props} />);
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(push).toHaveBeenCalledWith("/aluno/calendario?month=2026-12", { scroll: false });
  });

  it("explica um dia sem atividades", async () => {
    const user = userEvent.setup();
    const { container } = render(<MonthlyAgenda {...props} />);
    await user.click(container.querySelector<HTMLButtonElement>('button[data-date="2026-11-22"]')!);
    expect(screen.getByText("Nenhuma atividade neste dia.")).toBeInTheDocument();
  });
});
