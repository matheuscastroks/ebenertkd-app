import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/billing/report-service", () => ({ getMonthlyClosingOverview: vi.fn() }));
vi.mock("@/features/events/summary-service", () => ({ getEventsSummary: vi.fn() }));
vi.mock("@/features/events/components/events-summary-card", () => ({ EventsSummaryCard: () => null }));
vi.mock("@/features/billing/components/closing-competence-picker", () => ({ ClosingCompetencePicker: () => null }));
vi.mock("@/features/billing/components/billing-overview-chart", () => ({ BillingOverviewChart: () => null }));
vi.mock("@/features/billing/components/closing-breakdown-chart", () => ({ ClosingBreakdownChart: () => null }));
import { getMonthlyClosingOverview } from "@/features/billing/report-service";
import { MonthlyClosingContent } from "./closing-content";

const report = {
  competence: "2026-10",
  readyToClose: false,
  underReviewCount: 2,
  underReviewCents: 30000,
  expectedCents: 500000,
  receivedCompetenceCents: 400000,
  netCashInMonthCents: 410000,
  recoveredPriorCents: 10000,
  overdueCents: 15000,
  overdueCount: 1,
  defaultRatePct: 3,
  reversalsCents: 0,
  reversalsCount: 0,
  pendingCents: 0,
  categories: []
};

const charge = (id: string, status: string) => ({
  $id: id, status, studentName: `Aluno ${id}`, description: "Mensalidade", due_date: "2026-10-10", amount_cents: 15000
});

describe("fechamento do mês", () => {
  it("abre pelas pendências e cita os comprovantes uma vez só", async () => {
    vi.mocked(getMonthlyClosingOverview).mockResolvedValue({
      report, competences: ["2026-10"], monthlySeries: [],
      openCharges: [charge("a", "proof_under_review"), charge("b", "overdue")]
    } as never);
    render(await MonthlyClosingContent({}));
    const pending = screen.getByRole("heading", { name: /Para fechar/ });
    const summary = screen.getByLabelText(/Resumo de/);
    expect(pending.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText(/comprovantes esperando conferência/)).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Conferir comprovantes/ })).toHaveAttribute(
      "href", "/admin/financeiro?status=proof_under_review&competence=2026-10"
    );
    expect(screen.queryByText(/DRE|Inadimplência|Conciliação/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver resultado do mês/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("diz que não há pendências quando o mês está pronto", async () => {
    vi.mocked(getMonthlyClosingOverview).mockResolvedValue({
      report: { ...report, readyToClose: true, underReviewCount: 0 }, competences: [], monthlySeries: [], openCharges: []
    } as never);
    render(await MonthlyClosingContent({}));
    expect(screen.getByRole("heading", { name: /Nada pendente/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Conferir comprovantes/ })).not.toBeInTheDocument();
  });
});
