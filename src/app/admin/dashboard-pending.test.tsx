import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/students/service", () => ({ countEnrollmentsRequiringReview: vi.fn(), listEnrollmentsForReview: vi.fn() }));
vi.mock("@/features/billing/report-service", () => ({ getBillingOverview: vi.fn() }));
vi.mock("@/features/classes/service", () => ({ listTrainingClasses: vi.fn() }));
vi.mock("@/features/classes/schedule", () => ({ getTodayWeekday: () => "Segunda" }));
vi.mock("@/features/exams/service", () => ({ listExamEvents: vi.fn() }));
import { getBillingOverview } from "@/features/billing/report-service";
import { listEnrollmentsForReview } from "@/features/students/service";
import { listTrainingClasses } from "@/features/classes/service";
import { UrgentTasksSection, TodayClassesSection } from "./dashboard-sections";

describe("dashboard do professor", () => {
  it("não mascara falha de pendências como tudo em dia", async () => {
    vi.mocked(listEnrollmentsForReview).mockRejectedValue(new Error("offline"));
    vi.mocked(getBillingOverview).mockRejectedValue(new Error("offline"));
    render(await UrgentTasksSection());
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar pendências");
    expect(screen.getByRole("link", { name: "Tentar novamente" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByText(/Tudo em dia/)).not.toBeInTheDocument();
  });
  it("identifica o aluno e aponta para a cobrança", async () => {
    vi.mocked(listEnrollmentsForReview).mockResolvedValue({ rows: [] } as never);
    vi.mocked(getBillingOverview).mockResolvedValue({ charges: [{ $id: "c1", student_id: "s1", amount_cents: 10000 }], names: new Map([["s1", "Ana Silva"]]) } as never);
    render(await UrgentTasksSection());
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Conferir/ })).toHaveAttribute("href", "/admin/financeiro?status=proof_under_review&student=Ana%20Silva#cobranca-c1");
  });
  it("ordena treinos por horário e informa local ausente", async () => {
    vi.mocked(listTrainingClasses).mockResolvedValue([
      { $id: "t2", name: "Noite", status: "active", weekdays: ["Segunda"], start_time: "19:00", end_time: "20:00" },
      { $id: "t1", name: "Manhã", status: "active", weekdays: ["Segunda"], start_time: "09:00", end_time: "10:00" },
    ] as never);
    render(await TodayClassesSection());
    expect(screen.getAllByRole("link", { name: "Fazer chamada" })[0]).toHaveAttribute("href", "/admin/turmas/t1");
    expect(screen.getAllByText("Local não informado")).toHaveLength(2);
  });
});
