import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/actions/training-classes", () => ({ setTrainingClassStatusAction: vi.fn() }));
import { setTrainingClassStatusAction } from "@/app/actions/training-classes";
import { ClassStatusToggle } from "./class-status-toggle";

describe("ClassStatusToggle", () => {
  it("desabilita durante envio e reverte quando falha", async () => {
    let resolve!: (value: { success: false; error: string }) => void;
    vi.mocked(setTrainingClassStatusAction).mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<ClassStatusToggle classId="class-1" active />);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    await act(async () => resolve({ success: false, error: "Não foi possível alterar a turma" }));
    expect(screen.getByRole("switch")).toBeEnabled();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível alterar a turma");
    expect(screen.getByRole("switch").parentElement).toHaveClass("min-h-11");
  });
  it("confirma pausa e explica efeito na matrícula", async () => {
    vi.mocked(setTrainingClassStatusAction).mockResolvedValue({ success: true });
    render(<ClassStatusToggle classId="class-1" active />);
    await act(async () => fireEvent.click(screen.getByRole("switch")));
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Turma pausada. Não aparece na matrícula.");
  });
  it("acompanha o estado confirmado quando o servidor renderiza novas props", () => {
    const { rerender } = render(<ClassStatusToggle classId="class-1" active />);
    rerender(<ClassStatusToggle classId="class-1" active={false} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    rerender(<ClassStatusToggle classId="class-1" active />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});