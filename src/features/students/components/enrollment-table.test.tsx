import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EnrollmentTable } from "@/features/students/components/enrollment-table";
import type { Enrollment, Student } from "@/features/students/types";

describe("EnrollmentTable", () => {
  it("shows operational data and preserves the review destination", () => {
    const student = {
      $id: "student-1",
      full_name: "Camila Ferreira",
      current_belt: "Azul",
      gub: 4,
      training_class: "Adulto noite",
    } as Student;
    const enrollment = {
      status: "under_review",
      requested_due_day: 10,
    } as Enrollment;
    render(<EnrollmentTable rows={[{ student, enrollment }]} />);
    expect(screen.getAllByText("Camila Ferreira")).toHaveLength(2);
    expect(screen.getAllByText("Em análise")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Analisar/ })[0]).toHaveAttribute(
      "href",
      "/admin/matriculas/student-1"
    );
  });

  it("sorts rows when clicking the Aluno column header", async () => {
    const user = userEvent.setup();
    const studentA = {
      $id: "student-1",
      full_name: "Carlos Eduardo",
      current_belt: "Branca",
      gub: 10,
    } as Student;
    const studentB = {
      $id: "student-2",
      full_name: "Ana Clara",
      current_belt: "Azul",
      gub: 4,
    } as Student;

    render(
      <EnrollmentTable
        rows={[
          { student: studentA, enrollment: null },
          { student: studentB, enrollment: null },
        ]}
      />
    );

    const sortButton = screen.getByRole("button", { name: /Aluno:/i });

    // Initial order: Carlos, Ana
    const initialNames = screen
      .getAllByText(/Carlos Eduardo|Ana Clara/)
      .map((el) => el.textContent);
    expect(initialNames[0]).toBe("Carlos Eduardo");

    // Click 1: asc -> Ana Clara first
    await user.click(sortButton);
    const ascNames = screen
      .getAllByText(/Carlos Eduardo|Ana Clara/)
      .map((el) => el.textContent);
    expect(ascNames[0]).toBe("Ana Clara");

    // Click 2: desc -> Carlos Eduardo first
    await user.click(sortButton);
    const descNames = screen
      .getAllByText(/Carlos Eduardo|Ana Clara/)
      .map((el) => el.textContent);
    expect(descNames[0]).toBe("Carlos Eduardo");
  });
});
