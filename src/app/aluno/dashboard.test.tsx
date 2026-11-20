import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Profile } from "@/features/auth/types";
import type { Charge } from "@/features/billing/types";
import type { Contract } from "@/features/contracts/types";
vi.mock("server-only", () => ({}));
vi.mock("@/features/classes/attendance-history-service", () => ({ getAttendanceHistory: vi.fn() }));
vi.mock("@/features/billing/charge-service", () => ({ listChargesForStudent: vi.fn() }));
vi.mock("@/features/contracts/contract-service", () => ({ listStudentContracts: vi.fn() }));
vi.mock("@/features/classes/service", () => ({ getTrainingClass: vi.fn() }));
vi.mock("@/features/onboarding/components/onboarding-trigger", () => ({ OnboardingTrigger: () => null }));
vi.mock("@/app/actions/family", () => ({ enableGuardianAction: vi.fn() }));
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
const profile = { $id: "student", role: "adult_student", full_name: "Ana", capabilities: ["student"] } as Profile;
const activeStudent = { status: "active", rank_key: "gub-8" };
beforeEach(() => {
  vi.mocked(getAttendanceHistory).mockResolvedValue({ profile, student: null, entries: [], summary: { total: 0, attended: 0, rate: 0 } });
  vi.mocked(listChargesForStudent).mockReset().mockResolvedValue([]);
  vi.mocked(listStudentContracts).mockReset().mockResolvedValue([]);
});
it("mostra frequência sem dados sem inventar 100%", async () => {
  render(await StudentDashboardDynamic({ profile, minor: false }));
  expect(screen.getByText("Ainda sem aulas registradas")).toBeInTheDocument();
  expect(screen.queryByText("100%")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Preencher ficha" })).toHaveAttribute("href", "/aluno/matricula");
});
it("não consulta nem mostra financeiro para menor", async () => {
  render(await StudentDashboardDynamic({ profile: { ...profile, role: "minor_student" }, minor: true }));
  expect(listChargesForStudent).not.toHaveBeenCalled();
  expect(listStudentContracts).not.toHaveBeenCalled();
  expect(screen.queryByText("Pagar mensalidade")).not.toBeInTheDocument();
  expect(screen.queryByText("Mensalidade")).not.toBeInTheDocument();
  expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
});
it("destaca só a pendência mais urgente como ação principal", async () => {
  vi.mocked(getAttendanceHistory).mockResolvedValue({ profile, student: activeStudent, entries: [], summary: { total: 0, attended: 0, rate: 0 } } as never);
  vi.mocked(listChargesForStudent).mockResolvedValue([{ status: "overdue", due_date: "2026-11-05", amount_cents: 15000 } as Charge]);
  vi.mocked(listStudentContracts).mockResolvedValue([{ $id: "c1", status: "pending_signature" } as Contract]);
  render(await StudentDashboardDynamic({ profile, minor: false }));
  expect(screen.getByText("Em atraso")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Pagar mensalidade" })).toHaveAttribute("data-variant", "default");
  expect(screen.getByRole("link", { name: "Assinar contrato" })).toHaveAttribute("data-variant", "outline");
});
it("não esconde falha do financeiro como tudo em dia", async () => {
  vi.mocked(getAttendanceHistory).mockResolvedValue({ profile, student: activeStudent, entries: [], summary: { total: 0, attended: 0, rate: 0 } } as never);
  vi.mocked(listChargesForStudent).mockRejectedValue(new Error("unavailable"));
  render(await StudentDashboardDynamic({ profile, minor: false }));
  expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os pagamentos");
  expect(screen.queryByText(/Tudo em dia/)).not.toBeInTheDocument();
});
it("mostra estado em dia quando não há pendências", async () => {
  vi.mocked(getAttendanceHistory).mockResolvedValue({ profile, student: activeStudent, entries: [], summary: { total: 4, attended: 3, rate: 75 } } as never);
  render(await StudentDashboardDynamic({ profile, minor: false }));
  expect(screen.getByText(/Tudo em dia/)).toBeInTheDocument();
  expect(screen.getByText(/Frequência 75% · 3 de 4 aulas/)).toBeInTheDocument();
});
it("abre pelas pendências, resume a frequência numa linha e não repete o menu", async () => {
  vi.mocked(getAttendanceHistory).mockResolvedValue({ profile, student: activeStudent, entries: [], summary: { total: 4, attended: 3, rate: 75 } } as never);
  vi.mocked(listChargesForStudent).mockResolvedValue([{ status: "overdue", due_date: "2026-11-05", amount_cents: 15000 } as Charge]);
  render(await StudentDashboardDynamic({ profile, minor: false }));
  const pendencies = screen.getByRole("heading", { name: "Pendências" });
  const next = screen.getByRole("heading", { name: "Próximo treino" });
  expect(pendencies.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("link", { name: /Frequência 75%/ })).toHaveAttribute("href", "/aluno/frequencia");
  expect(screen.queryByText("Dados e documentos")).not.toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /frequência/i })).not.toBeInTheDocument();
});
