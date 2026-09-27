import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingModal } from "./onboarding-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/actions/onboarding", () => ({
  saveOnboardingAction: vi.fn().mockResolvedValue({ success: true }),
  skipOnboardingAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("OnboardingModal", () => {
  it("renders welcome step for admin with progress bar and benefits", () => {
    render(
      <OnboardingModal
        role="admin"
        userName="Ebener Santos"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Passo 1 de 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Olá, Ebener!/i)).toBeInTheDocument();
    expect(screen.getByText(/Mestre Ebener Santos/i)).toBeInTheDocument();
    expect(screen.getByText(/Pular apresentação/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeInTheDocument();
  });

  it("navigates from step 1 to preferences step 2 and selects options", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingModal
        role="admin"
        userName="Ebener Santos"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Continuar/i }));
    expect(screen.getByText(/Passo 2 de 3 · Personalização/i)).toBeInTheDocument();
    expect(screen.getByText(/Qual é o principal foco da sua gestão hoje\?/i)).toBeInTheDocument();

    const attendanceOption = screen.getByRole("radio", { name: /Controle de Aulas e Chamadas/i });
    expect(attendanceOption).toHaveAttribute("aria-checked", "false");
    await user.click(attendanceOption);
    expect(attendanceOption).toHaveAttribute("aria-checked", "true");
  });

  it("calls skip action when clicking Pular", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <OnboardingModal
        role="adult_student"
        userName="Camila Ferreira"
        isOpen={true}
        onClose={handleClose}
      />
    );

    const skipButton = screen.getByRole("button", { name: /Pular apresentação/i });
    await user.click(skipButton);
    expect(handleClose).toHaveBeenCalled();
  });
});
