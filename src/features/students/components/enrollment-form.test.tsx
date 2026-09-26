import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/enrollment", () => ({
  saveEnrollmentDraftAction: vi.fn(),
  submitEnrollmentAction: vi.fn()
}));

import { EnrollmentForm } from "@/features/students/components/enrollment-form";
import type { Enrollment, EnrollmentBundle, Student, StudentDocument } from "@/features/students/types";
import type { TrainingClass } from "@/features/classes/types";

describe("EnrollmentForm", () => {
  const student = {
    $id: "student-1",
    full_name: "Guilherme Santos",
    cpf: "12345678901",
    birth_date: "2010-05-15",
    whatsapp: "11999999999",
    address: "Rua do Dojô, 100",
    emergency_contact_name: "Marta Santos",
    emergency_contact_relationship: "Mãe",
    emergency_contact_phone: "11988888888",
    started_at_tkd: "2020-01-10",
    current_belt: "Amarela",
    gub: 8,
    status: "draft"
  } as Student;

  const enrollment = {
    $id: "enrollment-1",
    student_id: "student-1",
    status: "draft",
    requested_due_day: 10,
    revision: 1
  } as Enrollment;

  const documents = [
    {
      $id: "doc-1",
      student_id: "student-1",
      document_type: "profile_photo",
      file_id: "file-1",
      original_name: "foto.jpg",
      mime_type: "image/jpeg",
      size_bytes: 1024,
      status: "pending",
      uploaded_by_account_id: "acc-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z"
    },
    {
      $id: "doc-2",
      student_id: "student-1",
      document_type: "medical_certificate",
      file_id: "file-2",
      original_name: "atestado.pdf",
      mime_type: "application/pdf",
      size_bytes: 2048,
      status: "rejected",
      rejection_reason: "Documento ilegível",
      uploaded_by_account_id: "acc-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z"
    }
  ] as unknown as StudentDocument[];

  const classes = [
    {
      $id: "class-1",
      name: "Infantil Manhã",
      weekdays: ["segunda", "quarta"],
      start_time: "09:00",
      end_time: "10:00",
      status: "active"
    }
  ] as unknown as TrainingClass[];

  const bundle: EnrollmentBundle = { student, enrollment, documents };

  it("renders form sections with translated document status labels", () => {
    render(<EnrollmentForm bundle={bundle} targetProfileId="profile-1" classes={classes} />);

    expect(screen.getByText("Ficha de matrícula")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Guilherme Santos")).toBeInTheDocument();
    // Verify formatted phone inputs:
    expect(screen.getByDisplayValue("(11) 9 9999-9999")).toBeInTheDocument();
    expect(screen.getByDisplayValue("(11) 9 8888-8888")).toBeInTheDocument();

    // Verify translated document statuses:
    expect(screen.getByText("Aguardando análise")).toBeInTheDocument();
    expect(screen.getByText("Correção: Documento ilegível")).toBeInTheDocument();

    // Verify submit and save buttons are present:
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar para análise" })).toBeInTheDocument();
  });
});
