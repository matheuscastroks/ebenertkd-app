import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnrollmentStatusView } from "./enrollment-status-view";
import type { EnrollmentBundle } from "@/features/students/types";

vi.mock("@/components/academy-config-provider", () => ({
  useBeltRanks: () => [],
  useBeltLabels: () => ({ levelLabel: "Nível" }),
  useDueDayOptions: () => [10],
}));

const bundle = {
  student: { $id: "s1", full_name: "Lucas Mendes" },
  enrollment: { $id: "e1", status: "awaiting_signature" },
  documents: [],
} as unknown as EnrollmentBundle;

describe("EnrollmentStatusView", () => {
  it("convida o adulto a assinar o contrato", () => {
    render(<EnrollmentStatusView bundle={bundle} classes={[]} contractsHref="/aluno/contratos" onEdit={() => {}} />);
    expect(screen.getByRole("link", { name: /Assinar contrato/ })).toHaveAttribute("href", "/aluno/contratos");
  });

  it("diz ao menor que quem assina é o responsável", () => {
    render(<EnrollmentStatusView bundle={bundle} classes={[]} contractsHref="/aluno/contratos" guardianSigns onEdit={() => {}} />);
    expect(screen.getByText("Ficha aprovada · Falta o responsável assinar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver contrato/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Assinar contrato/ })).toBeNull();
  });
});
