import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/notifications", () => ({ sendTargetedNotificationAction: vi.fn() }));
vi.mock("@/features/students/compliance-service", () => ({ getAnnualComplianceOverview: vi.fn() }));
vi.mock("@/features/students/components/student-avatar", () => ({ StudentAvatar: () => null }));
import { getAnnualComplianceOverview } from "@/features/students/compliance-service";
import { ComplianceContent } from "./compliance-content";

const row = (over: Record<string, unknown>) => ({
  studentId: "s1", profileId: "p1", fullName: "Ana Silva", trainingClassName: "Adulto",
  photoDocumentId: null, medicalStatus: "valid", parqStatus: "valid", parqHasYesAnswer: false,
  medicalExpiresAt: null, parqExpiresAt: null, ...over,
});

const overview = (rows: unknown[]) => ({
  rows,
  bucketCounts: { expired: 1, expiring_soon: 0, pending: 1, valid: 0 },
  policy: { medical_expiring_window_days: 45, parq_expiring_window_days: 45 },
});

describe("documentos anuais", () => {
  it("filtra por chips com contagem e rótulo vindo da política", async () => {
    vi.mocked(getAnnualComplianceOverview).mockResolvedValue(overview([row({ medicalStatus: "expired", parqStatus: "missing" })]) as never);
    render(await ComplianceContent({ query: { status: "expired", turma: "t1" } }));
    const chips = screen.getByRole("navigation", { name: "Situação dos documentos" });
    expect(chips).toHaveTextContent("Vencem em 45 dias");
    expect(screen.getByRole("link", { name: /Vencidos/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Pendentes/ })).toHaveAttribute("href", "/admin/matriculas/regularidade?turma=t1&status=pending");
    expect(screen.queryByText(/12m|12 meses/)).not.toBeInTheDocument();
  });

  it("mostra os dois documentos na mesma linha e um único pedido", async () => {
    vi.mocked(getAnnualComplianceOverview).mockResolvedValue(overview([row({ medicalStatus: "expired", parqStatus: "missing" })]) as never);
    render(await ComplianceContent({ query: {} }));
    expect(screen.getByText("Atestado vencido")).toBeInTheDocument();
    expect(screen.getByText("PAR-Q por preencher")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Pedir/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Pedir atestado e PAR-Q para Ana Silva" })).toBeInTheDocument();
  });

  it("não oferece pedido para quem está em dia", async () => {
    vi.mocked(getAnnualComplianceOverview).mockResolvedValue(overview([row({})]) as never);
    render(await ComplianceContent({ query: {} }));
    expect(screen.getByText("Documentos em dia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pedir/ })).not.toBeInTheDocument();
  });
});
