import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OnboardingChecklist } from "./onboarding-checklist";

describe("OnboardingChecklist", () => {
  const items = [
    { id: "1", label: "Conta verificada", href: "/admin", completed: true },
    { id: "2", label: "Cadastrar turmas", href: "/admin/turmas", completed: false },
    { id: "3", label: "Acompanhar exames", href: "/admin/exames", completed: false },
  ];

  it("renders checklist with correct progress percentage", () => {
    render(<OnboardingChecklist role="admin" items={items} />);

    expect(screen.getByText(/Primeiros Passos da Gestão/i)).toBeInTheDocument();
    expect(screen.getByText(/1 de 3 etapas concluídas \(33%\)/i)).toBeInTheDocument();
    expect(screen.getByText("Conta verificada")).toBeInTheDocument();
    expect(screen.getByText("Cadastrar turmas")).toBeInTheDocument();
  });

  it("collapses and expands when clicking the toggle button", async () => {
    const user = userEvent.setup();
    render(<OnboardingChecklist role="admin" items={items} />);

    const toggleButton = screen.getByRole("button", { name: /Recolher checklist/i });
    await user.click(toggleButton);

    expect(screen.queryByText("Cadastrar turmas")).not.toBeInTheDocument();

    const expandButton = screen.getByRole("button", { name: /Expandir checklist/i });
    await user.click(expandButton);

    expect(screen.getByText("Cadastrar turmas")).toBeInTheDocument();
  });

  it("does not render if all items are completed", () => {
    const completedItems = items.map((i) => ({ ...i, completed: true }));
    const { container } = render(<OnboardingChecklist role="admin" items={completedItems} />);
    expect(container).toBeEmptyDOMElement();
  });
});
