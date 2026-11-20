import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/billing/report-service", () => ({ getBillingOverview: vi.fn() }));
vi.mock("@/features/billing/components/billing-table", () => ({ BillingTable: () => <table aria-label="Cobranças" /> }));
vi.mock("@/components/shared/list-pagination", () => ({ ListPagination: () => null }));
import { getBillingOverview } from "@/features/billing/report-service";
import { BillingResults } from "./billing-results";

const overview = (charges: unknown[]) => ({
  charges, names: new Map(), photosByStudent: new Map(), proofsByCharge: new Map(), payments: [],
  statusCounts: { proof_under_review: 2, overdue: 1, pending: 3, paid: 4, cancelled: 0 },
  pagination: { page: 1, pageSize: 20, total: charges.length, totalPages: 1 },
});

describe("cobranças", () => {
  it("usa chips com contagem como filtro de situação e preserva os outros filtros", async () => {
    vi.mocked(getBillingOverview).mockResolvedValue(overview([{ $id: "c1" }]) as never);
    render(await BillingResults({ params: { status: "overdue", competence: "2026-10" } }));
    expect(screen.getByRole("link", { name: /Todas\s*10/ })).toHaveAttribute("href", "/admin/financeiro?competence=2026-10");
    expect(screen.getByRole("link", { name: /Em atraso/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Para conferir\s*2/ })).toHaveAttribute("href", "/admin/financeiro?competence=2026-10&status=proof_under_review");
    expect(screen.queryByText(/Distribuição do mês/)).not.toBeInTheDocument();
    expect(vi.mocked(getBillingOverview)).toHaveBeenCalledWith(expect.objectContaining({ status: "overdue", competence: "2026-10" }));
  });

  it("explica o vazio de comprovantes", async () => {
    vi.mocked(getBillingOverview).mockResolvedValue(overview([]) as never);
    render(await BillingResults({ params: { status: "proof_under_review" } }));
    expect(screen.getByText("Não há comprovantes esperando conferência.")).toBeInTheDocument();
  });
});
