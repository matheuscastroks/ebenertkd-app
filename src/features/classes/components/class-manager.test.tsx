import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/actions/training-classes", () => ({ createTrainingClassAction: vi.fn(), updateTrainingClassAction: vi.fn() }));
vi.mock("@/components/shared/operation-toast", () => ({ OperationToast: ({ tone, title }: { tone: string; title: string }) => <div role="status" data-tone={tone}>{title}</div> }));
import { ClassManager } from "./class-manager";

describe("ClassManager", () => {
  it("usa título simples e tom explícito sem inferir o texto", () => {
    render(<ClassManager classes={[]} notice="Falha ao salvar" noticeTone="error" />);
    // O título "Turmas" fica só no cabeçalho da página; o componente não o repete.
    expect(screen.queryByRole("heading", { name: "Turmas" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "error");
    const button = screen.getByRole("button", { name: "Nova turma" });
    expect(button).toHaveClass("min-h-11");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Sobre a disponibilidade das turmas" })).not.toBeInTheDocument();
  });
  it("deixa a criação de turma como única ação primária", () => {
    render(<ClassManager classes={[{ $id: "t1", name: "Adulto", status: "active", weekdays: ["Segunda"], start_time: "19:00", end_time: "20:00" }, { $id: "t2", name: "Infantil", status: "inactive", weekdays: ["Terça"], start_time: "18:00", end_time: "19:00" }] as never} />);
    expect(screen.getByText("1 de 2 turmas ativas")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: "Fazer chamada" })) expect(link).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("button", { name: "Nova turma" })).toHaveAttribute("data-variant", "default");
  });
});
