import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Profile } from "@/features/auth/types";
import type { Charge } from "@/features/billing/types";
vi.mock("server-only", () => ({}));
vi.mock("@/features/classes/service", () => ({ listTrainingClasses: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/students/service", () => ({ listProfilePhotoDocumentIds: vi.fn().mockResolvedValue(new Map()) }));
vi.mock("@/features/classes/attendance-history-service", () => ({ getAttendanceHistory: vi.fn().mockResolvedValue({ student: null, summary: { total: 0, rate: 0 }, entries: [] }) }));
vi.mock("@/features/billing/charge-service", () => ({ listChargesForStudent: vi.fn() }));
vi.mock("@/features/contracts/contract-service", () => ({ listStudentContracts: vi.fn().mockResolvedValue([]) }));
import { listChargesForStudent } from "@/features/billing/charge-service";
import { GuardianMinorsOverview } from "./guardian-overview";
const guardian = { $id: "guardian" } as Profile;
const minors = [{ $id: "ana", full_name: "Ana" }, { $id: "bia", full_name: "Bia" }] as Profile[];
beforeEach(() => { vi.mocked(listChargesForStudent).mockReset(); });
it("mantém comprovante em análise visível e ações vinculadas a cada filho", async () => {
  vi.mocked(listChargesForStudent).mockResolvedValue([{ status: "proof_under_review", due_date: "2026-11-05", amount_cents: 15000 } as Charge]);
  render(await GuardianMinorsOverview({ guardian, minors }));
  expect(screen.getAllByText("Comprovante em análise")).toHaveLength(2);
  expect(screen.queryByText("Em dia")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Financeiro" }).map((link) => link.getAttribute("href"))).toEqual(["/responsavel/dependentes/ana/financeiro", "/responsavel/dependentes/bia/financeiro"]);
});
it("não esconde falha de consulta como pagamento em dia", async () => {
  vi.mocked(listChargesForStudent).mockRejectedValue(new Error("unavailable"));
  render(await GuardianMinorsOverview({ guardian, minors: minors.slice(0, 1) }));
  expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os pagamentos");
  expect(screen.queryByText("Em dia")).not.toBeInTheDocument();
});
