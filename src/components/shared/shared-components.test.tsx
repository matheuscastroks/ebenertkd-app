import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/shared/empty-state";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb";
import { StatusBadge } from "@/components/shared/status-badge";

describe("shared UI patterns", () => {
  it("renders an actionable empty state", () => {
    render(<EmptyState title="Nenhum aluno" description="Cadastre o primeiro aluno." action={<button>Novo aluno</button>} />);
    expect(screen.getByRole("heading", { name: "Nenhum aluno" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo aluno" })).toBeInTheDocument();
  });

  it("marks the current breadcrumb page", () => {
    render(<PageBreadcrumb items={[{ label: "Matrículas", href: "/admin/matriculas" }, { label: "Camila Ferreira" }]} />);
    expect(screen.getByText("Camila Ferreira")).toHaveAttribute("aria-current", "page");
  });

  it("keeps status text visible", () => {
    render(<StatusBadge tone="success">Pago</StatusBadge>);
    expect(screen.getByText("Pago")).toBeVisible();
  });
});
