import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/enrollment-review", () => ({
  advanceToSignatureAction: vi.fn(),
  adminUpdateStudentAction: vi.fn(),
  reviewDocumentAction: vi.fn(),
  saveFinancialReviewAction: vi.fn(),
  setAccessOverrideAction: vi.fn()
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
    rank_key: "gub-6",
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
    expect(screen.getByText("Identificação e contato")).toBeInTheDocument();
    expect(screen.getByText("Sem restrições")).toBeInTheDocument();

    // Formatted phone numbers check
    expect(screen.getByText("(11) 9 8888-7777")).toBeInTheDocument();
    expect(screen.getByText("(11) 9 7777-6666")).toBeInTheDocument();

    // Photo check: shown as identification, NO "Aprovar" button for photo
    expect(screen.getByText("Foto do aluno (identificação)")).toBeInTheDocument();
    expect(screen.getByText("Cadastrada")).toBeInTheDocument();

    // Medical certificate is approved: buttons should NOT be clickable / rendered
    expect(screen.getByText("Atestado validado e arquivado com sucesso.")).toBeInTheDocument();
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

  it("puts the enrollment decision first while the record waits for review", () => {
    render(<ReviewPanel bundle={{ student, enrollment, documents: [] }} reviews={[{ $id: "r1", action: "financial_updated", created_at: "2026-11-18T12:00:00Z" }]} />);
    const decide = screen.getByRole("heading", { name: "Decidir matrícula" });
    const data = screen.getByRole("heading", { name: "Identificação e contato" });
    expect(decide.compareDocumentPosition(data) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: /Liberar para assinatura/ })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Histórico da análise/ }));
    expect(screen.getByText("Condições financeiras salvas")).toBeInTheDocument();
  });

  it("keeps the decision next to the contract once the enrollment is active", () => {
    render(<ReviewPanel bundle={{ student, enrollment: { ...enrollment, status: "active" }, documents: [] }} reviews={[]} contractDurationMonths={6} />);
    const contract = screen.getByRole("heading", { name: "Condições do contrato" });
    const decide = screen.getByRole("heading", { name: "Decidir matrícula" });
    expect(contract.compareDocumentPosition(decide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Fim do contrato \(6 meses\)/)).toBeInTheDocument();
  });
});
