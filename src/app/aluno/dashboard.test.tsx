import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Profile } from "@/features/auth/types";
vi.mock("server-only", () => ({}));
vi.mock("@/features/classes/attendance-history-service", () => ({ getAttendanceHistory: vi.fn() }));
vi.mock("@/features/billing/charge-service", () => ({ listChargesForStudent: vi.fn() }));
vi.mock("@/features/classes/service", () => ({ getTrainingClass: vi.fn() }));
vi.mock("@/features/onboarding/components/onboarding-trigger", () => ({ OnboardingTrigger: () => null }));
vi.mock("@/app/actions/family", () => ({ enableGuardianAction: vi.fn() }));
import { getAttendanceHistory } from "@/features/classes/attendance-history-service";
import { listChargesForStudent } from "@/features/billing/charge-service";
import { StudentDashboardDynamic } from "@/features/students/components/student-dashboard";
const profile = { $id: "student", role: "adult_student", full_name: "Ana", capabilities: ["student"] } as Profile;
beforeEach(() => {
  vi.mocked(getAttendanceHistory).mockResolvedValue({ profile, student: null, entries: [], summary: { total: 0, attended: 0, rate: 0 } });
  vi.mocked(listChargesForStudent).mockResolvedValue([]);
});
it("mostra frequência sem dados sem inventar 100%", async () => {
  render(await StudentDashboardDynamic({ profile, minor: false }));
  expect(screen.getByText("Ainda sem aulas registradas")).toBeInTheDocument();
  expect(screen.queryByText("100%")).not.toBeInTheDocument();
  expect(screen.queryByText("Situação financeira")).not.toBeInTheDocument();
});
it("não consulta nem mostra financeiro para menor", async () => {
  render(await StudentDashboardDynamic({ profile: { ...profile, role: "minor_student" }, minor: true }));
  expect(listChargesForStudent).not.toHaveBeenCalled();
  expect(screen.queryByText("Pagar mensalidade")).not.toBeInTheDocument();
});
