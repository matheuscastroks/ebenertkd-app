import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/auth", () => ({
  promoteMinorAction: vi.fn()
}));

import { PromoteMinorDialog } from "@/features/students/components/promote-minor-dialog";

describe("PromoteMinorDialog", () => {
  it("renders trigger and displays student context when opened", () => {
    render(
      <PromoteMinorDialog
        minorProfileId="minor-123"
        studentName="Lucas Silva"
        currentQuery={{ q: "lucas", page: "2" }}
      />
    );

    const trigger = screen.getByRole("button", { name: "Configurar acesso próprio" });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByRole("heading", { name: "Configurar acesso próprio" })).toBeInTheDocument();
    expect(screen.getByText(/Lucas Silva/)).toBeInTheDocument();

    const hiddenMinorId = document.querySelector('input[name="minor_profile_id"]');
    expect(hiddenMinorId).toHaveValue("minor-123");

    const hiddenQ = document.querySelector('input[name="q"]');
    expect(hiddenQ).toHaveValue("lucas");

    const hiddenPage = document.querySelector('input[name="page"]');
    expect(hiddenPage).toHaveValue("2");

    expect(screen.getByLabelText("Novo e-mail do aluno")).toBeInTheDocument();
    expect(screen.getByLabelText("Manter acesso de consulta do responsável")).toBeInTheDocument();
  });
});
