import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/attendance", () => ({ saveAttendanceAction: vi.fn() }));
vi.mock("@/features/students/components/student-avatar", () => ({ StudentAvatar: ({ name }: { name: string }) => <span>{name.slice(0, 1)}</span> }));

import { AttendanceSheet } from "@/features/classes/components/attendance-sheet";

const rows = [
  { classEnrollmentId: "link-1", studentName: "Camila Ferreira", belt: "Faixa verde" },
  { classEnrollmentId: "link-2", studentName: "Rafael Nogueira", belt: "Faixa amarela" }
];

describe("AttendanceSheet", () => {
  it("requires the complete roster and can mark everyone present", () => {
    const { container } = render(<AttendanceSheet classId="class-1" lessonId="lesson-1" lessonCompleted={false} rows={rows} />);
    expect(screen.getByRole("button", { name: "Concluir chamada" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Marcar todos presentes" }));
    expect(screen.getByRole("button", { name: "Concluir chamada" })).toBeEnabled();
    expect(container.querySelectorAll('input[value="present"]')).toHaveLength(2);
    expect(screen.getByText("2 de 2 alunos marcados")).toBeInTheDocument();
  });

  it("requires a reason when a completed attendance is corrected", () => {
    render(<AttendanceSheet classId="class-1" lessonId="lesson-1" lessonCompleted rows={[{ ...rows[0], status: "present" }]} />);
    expect(screen.getByRole("button", { name: "Salvar correção" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Falta" }));
    expect(screen.getByLabelText("Motivo da correção")).toBeRequired();
    expect(screen.getByRole("button", { name: "Salvar correção" })).toBeEnabled();
  });
});
