import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  describeEnrollmentAction,
  EnrollmentTable,
  type EnrollmentRow,
} from "@/features/students/components/enrollment-table";
import type { Enrollment, Student } from "@/features/students/types";

function makeRow(
  id: string,
  name: string,
  status: Enrollment["status"],
  extras: Partial<Pick<EnrollmentRow, "pendingDocuments" | "rejectedDocuments">> = {}
): EnrollmentRow {
  const student = {
    $id: id,
    profile_id: `profile-${id}`,
    full_name: name,
    rank_key: "gub-9",
    training_class: "Infantil manhã",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Student;

  const enrollment = {
    $id: `enr-${id}`,
    student_id: id,
    status,
    requested_due_day: 10,
    revision: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Enrollment;

  return { student, enrollment, ...extras };
}

describe("EnrollmentTable", () => {
  it("explains whose turn it is and what needs review", () => {
    expect(
      describeEnrollmentAction(
        makeRow("1", "Ana", "submitted", { pendingDocuments: ["medical_certificate"] })
      )
    ).toMatchObject({
      hint: "Sua revisão: ficha e atestado médico",
      needsAdminReview: true,
      primaryLabel: "Revisar ficha",
      primaryHref: "/admin/matriculas/1",
    });

    expect(
      describeEnrollmentAction(
        makeRow("2", "Bruno", "active", { pendingDocuments: ["medical_certificate"] })
      )
    ).toMatchObject({
      hint: "Sua revisão: validar atestado médico",
      needsAdminReview: true,
      primaryLabel: "Revisar docs",
      primaryHref: "/admin/matriculas/2#documentos",
    });

    expect(
      describeEnrollmentAction(makeRow("3", "Carla", "awaiting_signature"))
    ).toMatchObject({
      hint: "Aguardando aluno: assinatura do contrato",
      needsAdminReview: false,
      primaryLabel: "Ver contrato",
      primaryHref: "/admin/matriculas/3#contrato",
    });

    expect(
      describeEnrollmentAction(
        makeRow("4", "Diego", "active", { rejectedDocuments: ["profile_photo"] })
      )
    ).toMatchObject({
      hint: "Aguardando aluno: reenvio de foto",
      needsAdminReview: false,
      primaryLabel: "Ver docs",
      primaryHref: "/admin/matriculas/4#documentos",
    });
  });

  it("renders pending hints and quick-action menu trigger in the table", () => {
    render(
      <EnrollmentTable
        rows={[
          makeRow("stu-1", "Lucas Mendes", "active", {
            pendingDocuments: ["medical_certificate"],
          }),
          makeRow("stu-2", "Camila Ferreira", "awaiting_signature"),
        ]}
      />
    );

    expect(screen.getAllByText("Sua revisão: validar atestado médico").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aguardando aluno: assinatura do contrato").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Revisar docs" })[0]).toHaveAttribute(
      "href",
      "/admin/matriculas/stu-1#documentos"
    );
    expect(
      screen.getAllByRole("button", { name: "Mais ações para Lucas Mendes" }).length
    ).toBeGreaterThan(0);
  });
});
