import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnrollmentTable } from "@/features/students/components/enrollment-table";
import type { Enrollment, Student } from "@/features/students/types";

describe("EnrollmentTable", () => {
  it("shows operational data and preserves the review destination", () => {
    const student = { $id: "student-1", full_name: "Camila Ferreira", current_belt: "Azul", gub: 4, training_class: "Adulto noite" } as Student;
    const enrollment = { status: "under_review", requested_due_day: 10 } as Enrollment;
    render(<EnrollmentTable rows={[{ student, enrollment }]} />);
    expect(screen.getAllByText("Camila Ferreira")).toHaveLength(2);
    expect(screen.getAllByText("Em análise")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Analisar/ })[0]).toHaveAttribute("href", "/admin/matriculas/student-1");
  });
});
