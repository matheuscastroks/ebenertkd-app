import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/renewals", () => ({ quickRenewContractAction: vi.fn() }));
vi.mock("@/features/contracts/renewal-service", () => ({ getContractRenewalPipeline: vi.fn() }));
import { getContractRenewalPipeline } from "@/features/contracts/renewal-service";
import { parseRenewalBucket, RenewalsContent } from "./renewals-content";

const counts = { expired: 1, due_7d: 0, due_30d: 2, due_60d: 3, due_90d: 4, healthy: 9 };
const pipeline = (rows: unknown[]) => ({
  rows,
  buckets: Object.entries(counts).map(([bucket, count]) => ({ bucket, label: bucket, count, monthlyRevenueCents: 0 })),
  summary: { attentionCount: 10, revenueAtRisk30dCents: 36000 },
});
const row = { contractId: "k1", studentId: "s1", profileId: "p1", studentName: "Ana Lima", guardianName: null, enrollmentStatus: "active", monthlyFeeCents: 12000, pendingFeeCents: null, startsAt: "2025-11-01", endsAt: "2026-11-30", suggestedNextEnd: "2027-11-30", daysRemaining: 10, bucket: "due_30d" };

describe("renovações", () => {
  it("troca KPIs e gráfico por chips de janela, cada um com seu próprio filtro", async () => {
    vi.mocked(getContractRenewalPipeline).mockResolvedValue(pipeline([row]) as never);
    render(await RenewalsContent({ search: "ana" }));
    expect(screen.getByRole("link", { name: /Em atenção\s*10/ })).toHaveAttribute("aria-current", "page");
    // 31 a 60 e 61 a 90 dias são filtros separados (antes "31–90d" abria só 31 a 60).
    expect(screen.getByRole("link", { name: /31 a 60 dias\s*3/ })).toHaveAttribute("href", "/admin/contratos/renovacoes?q=ana&bucket=due_60d");
    expect(screen.getByRole("link", { name: /61 a 90 dias\s*4/ })).toHaveAttribute("href", "/admin/contratos/renovacoes?q=ana&bucket=due_90d");
    expect(screen.getByText("Ana Lima")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Renovar/ })).toBeInTheDocument();
    expect(screen.queryByText(/Receita mensal em janela/)).not.toBeInTheDocument();
  });

  it("explica o vazio da janela escolhida e volta para em atenção", async () => {
    vi.mocked(getContractRenewalPipeline).mockResolvedValue(pipeline([]) as never);
    render(await RenewalsContent({ bucket: "due_7d" }));
    expect(screen.getByRole("link", { name: /Até 7 dias/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Ver contratos em atenção" })).toHaveAttribute("href", "/admin/contratos/renovacoes");
  });

  it("ignora janelas desconhecidas na URL", () => {
    expect(parseRenewalBucket("due_60d")).toBe("due_60d");
    expect(parseRenewalBucket("due_45d")).toBeUndefined();
  });
});
