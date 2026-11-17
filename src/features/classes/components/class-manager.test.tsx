import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/actions/training-classes", () => ({ createTrainingClassAction: vi.fn(), updateTrainingClassAction: vi.fn() }));
vi.mock("@/components/shared/operation-toast", () => ({ OperationToast: ({ tone, title }: { tone: string; title: string }) => <div role="status" data-tone={tone}>{title}</div> }));
import { ClassManager } from "./class-manager";

describe("ClassManager", () => {
  it("usa título simples e tom explícito sem inferir o texto", () => {
    render(<ClassManager classes={[]} notice="Falha ao salvar" noticeTone="error" />);
    expect(screen.getByRole("heading", { name: "Turmas" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", "error");
    const button = screen.getByRole("button", { name: "Nova turma" });
    expect(button).toHaveClass("min-h-11");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Sobre a disponibilidade das turmas" })).not.toBeInTheDocument();
  });
});
