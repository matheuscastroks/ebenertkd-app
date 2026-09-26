import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/enrollment-review", () => ({
  advanceToSignatureAction: vi.fn(),
  adminUpdateStudentAction: vi.fn(),
  reviewDocumentAction: vi.fn(),
  saveFinancialReviewAction: vi.fn()
}));

vi.mock("@/app/actions/renewals", () => ({
  renewContractAction: vi.fn()
}));

import { ReviewPanel } from "@/features/students/components/review-panel";
import type { Enrollment, EnrollmentBundle, Student, StudentDocument } from "@/features/students/types";

describe("ReviewPanel", () => {
  const student = {
    $id: "student-1",
    full_name: "Marina Lima",
    cpf: "12345678901",
    birth_date: "2005-04-12",
    whatsapp: "11988887777",
    address: "Av. Paulista, 1000",
    emergency_contact_name: "Carlos Lima",
    emergency_contact_relationship: "Pai",
    emergency_contact_phone: "11977776666",
    started_at_tkd: "2023-02-01",
    current_belt: "Verde",
    gub: 6,
    training_class: "Adulto Noite",
    health_condition: "no",
    status: "submitted"
  } as Student;

  const enrollment = {
    $id: "enrollment-1",
    student_id: "student-1",
    status: "under_review",
    requested_due_day: 15,
    revision: 1
  } as Enrollment;

  it("renders structured info card, pre-fills 1-year contract dates, and does not show approve button for photo", () => {
    const documents = [
      {
        $id: "photo-1",
        student_id: "student-1",
        document_type: "profile_photo",
        status: "pending"
      },
      {
        $id: "med-1",
        student_id: "student-1",
        document_type: "medical_certificate",
        status: "approved"
      }
    ] as unknown as StudentDocument[];

    const bundle: EnrollmentBundle = { student, enrollment, documents };

    render(<ReviewPanel bundle={bundle} reviews={[]} />);

    // Structured student info check
    expect(screen.getByText("Ficha cadastral do aluno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar dados" })).toBeInTheDocument();
    expect(screen.getByText("Identificação e Contato")).toBeInTheDocument();
    expect(screen.getByText("Sem restrições declaradas")).toBeInTheDocument();

    // Formatted phone numbers check
    expect(screen.getByText("(11) 9 8888-7777")).toBeInTheDocument();
    expect(screen.getByText("(11) 9 7777-6666")).toBeInTheDocument();

    // Photo check: shown as identification, NO "Aprovar" button for photo
    expect(screen.getByText("Foto do aluno (identificação)")).toBeInTheDocument();
    expect(screen.getByText("Cadastrada")).toBeInTheDocument();

    // Medical certificate is approved: buttons should NOT be clickable / rendered
    expect(screen.getByText("Atestado validado pela administração.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar atestado" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reprovar" })).not.toBeInTheDocument();

    // Form pre-filling check
    const feeInput = document.querySelector('input[name="monthly_fee_reais"]');
    expect(feeInput).toHaveValue(150);

    const startInput = document.querySelector('input[name="contract_start"]');
    const endInput = document.querySelector('input[name="contract_end"]');
    expect(startInput).toHaveValue();
    expect(endInput).toHaveValue();

    // 1 year difference between start and end year:
    const startYear = Number((startInput as HTMLInputElement).value.split("-")[0]);
    const endYear = Number((endInput as HTMLInputElement).value.split("-")[0]);
    expect(endYear).toBe(startYear + 1);
  });

  it("shows approve and reject buttons when medical certificate is pending", () => {
    const documents = [
      {
        $id: "med-1",
        student_id: "student-1",
        document_type: "medical_certificate",
        status: "pending"
      }
    ] as unknown as StudentDocument[];

    const bundle: EnrollmentBundle = { student, enrollment, documents };

    render(<ReviewPanel bundle={bundle} reviews={[]} />);

    expect(screen.getByRole("button", { name: "Aprovar atestado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reprovar" })).toBeInTheDocument();
  });
});
