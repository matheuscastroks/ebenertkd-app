import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/ui/calendar", () => ({ Calendar: () => <div>Calendário</div> }));
import { AttendanceHistory } from "./attendance-history";
it("não apresenta frequência de 100% ou progresso quando não há aulas", () => {
  render(<AttendanceHistory entries={[]} summary={{ attended: 0, total: 0, rate: 0 }} month="2026-11" basePath="/aluno/frequencia" />);
  expect(screen.getByText("Ainda sem aulas registradas")).toBeInTheDocument();
  expect(screen.queryByText("100%")).not.toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
