import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Charge } from "@/features/billing/types";
import { StudentExamsView } from "@/features/exams/components/student-exams-view";
import type { StudentExamEntry } from "@/features/exams/rules";
import type { ExamEvent, ExamParticipant } from "@/features/exams/types";

const upcoming: StudentExamEntry = {
  event: { $id: "event-1", name: "Exame de Dezembro", event_date: "2026-12-05T12:00:00.000Z", location: "Dojang Ebener", status: "confirmed" } as ExamEvent,
  participant: { $id: "p-1", status: "registered", target_rank_key: "gub-7", fee_cents: 8000, charge_id: "charge-1" } as ExamParticipant,
  charge: { $id: "charge-1", status: "pending" } as Charge
};

const graded: StudentExamEntry = {
  event: { $id: "event-0", name: "Exame de Junho", event_date: "2026-06-10T12:00:00.000Z", status: "completed" } as ExamEvent,
  participant: { $id: "p-0", status: "approved", target_rank_key: "gub-8", fee_cents: 8000, result_notes: "Nota interna da banca" } as ExamParticipant
};

describe("StudentExamsView", () => {
  it("shows the upcoming exam with fee status and a link to pay", () => {
    render(<StudentExamsView hasStudent currentRankKey="gub-8" upcoming={[upcoming]} past={[graded]} showFinancial billingHref="/aluno/financeiro" />);
    expect(screen.getByText("Exame de Dezembro")).toBeInTheDocument();
    expect(screen.getByText(/05 de dezembro de 2026/)).toBeInTheDocument();
    expect(screen.getByText("Dojang Ebener")).toBeInTheDocument();
    expect(screen.getByText("Taxa pendente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pagar taxa/ })).toHaveAttribute("href", "/aluno/financeiro");
  });

  it("lists results without exposing the examiners' notes", () => {
    render(<StudentExamsView hasStudent currentRankKey="gub-8" upcoming={[]} past={[graded]} showFinancial />);
    expect(screen.getByText("Exame de Junho")).toBeInTheDocument();
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    expect(screen.queryByText("Nota interna da banca")).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum exame agendado/)).toBeInTheDocument();
  });

  it("hides every financial detail when showFinancial is false", () => {
    render(<StudentExamsView hasStudent currentRankKey="gub-8" upcoming={[upcoming]} past={[]} showFinancial={false} billingHref="/aluno/financeiro" />);
    expect(screen.queryByText("Taxa pendente")).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Pagar taxa/ })).not.toBeInTheDocument();
  });

  it("explains when the enrollment is not ready yet", () => {
    render(<StudentExamsView hasStudent={false} upcoming={[]} past={[]} showFinancial />);
    expect(screen.getByText("Matrícula ainda não concluída")).toBeInTheDocument();
  });
});
