import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ExamResultActions } from "./exam-result-actions";

vi.mock("@/app/actions/exams", () => ({ recordExamResultAction: vi.fn() }));

it("mostra ações com alvo de 44px e confirma a mudança de faixa e a taxa", () => {
  render(<ExamResultActions participantId="p1" eventId="e1" name="Ana Souza" currentBelt="Branca" targetBelt="Amarela" feeCents={15000} />);
  expect(screen.getByRole("button", { name: "Aprovar" })).toHaveClass("h-11");
  expect(screen.getByRole("button", { name: "Reprovar" })).toHaveClass("h-11");
  expect(screen.getByRole("button", { name: "Ausente" })).toHaveClass("h-11");
  fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByText(/Muda a faixa de Branca para Amarela/)).toBeVisible();
  expect(screen.getByText(/150,00/)).toBeVisible();
  expect(screen.getByText("Ana Souza")).toBeVisible();
  expect(screen.getByRole("button", { name: "Confirmar: aprovar" })).toBeVisible();
});
