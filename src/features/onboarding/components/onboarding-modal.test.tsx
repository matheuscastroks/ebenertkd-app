import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText(/^Olá, Ebener$/i)).toBeInTheDocument();
    expect(screen.queryByText(/Momento de Valor/i)).toBeNull();
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
    await waitFor(() => expect(handleClose).toHaveBeenCalled());
  });
});

it("Esc no segundo passo retorna sem concluir", async () => {
  const user = userEvent.setup(); const onClose = vi.fn();
  render(<OnboardingModal role="admin" userName="Ebener" isOpen onClose={onClose} />);
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(screen.queryByText(/Momento de Valor/)).toBeNull();
  expect(screen.getAllByRole("button", { name: /Pular/ })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: /Continuar/ }));
  await user.keyboard("{Escape}");
  expect(screen.getByText(/Passo 1 de 3/)).toBeInTheDocument(); expect(onClose).not.toHaveBeenCalled();
});
import { saveOnboardingAction, skipOnboardingAction } from "@/app/actions/onboarding";

it("nao fecha ao falhar em pular e permite tentar novamente", async () => {
  const user = userEvent.setup(); const onClose = vi.fn();
  vi.mocked(skipOnboardingAction).mockResolvedValueOnce({ error: "failed_to_skip" });
  render(<OnboardingModal role="adult_student" userName="Ana" isOpen onClose={onClose} />);
  await waitFor(() => expect(screen.getByRole("button", { name: /Pular/ })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: /Pular/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível salvar/);
  expect(onClose).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole("button", { name: /Pular/ })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: /Pular/ }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 5000 });
});

it("preserva preferencias e passo quando conclusao falha", async () => {
  const user = userEvent.setup(); const onClose = vi.fn();
  vi.mocked(saveOnboardingAction).mockResolvedValueOnce({ error: "failed_to_save" });
  render(<OnboardingModal role="admin" userName="Ana" isOpen onClose={onClose} />);
  await user.click(screen.getByRole("button", { name: /Continuar/ }));
  await user.click(screen.getByRole("radio", { name: /Controle de Aulas e Chamadas/i }));
  await user.click(screen.getByRole("button", { name: /Continuar/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Agora não" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "Agora não" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível salvar/);
  expect(screen.getByText(/Passo 3 de 3/)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  const failedPreferences = vi.mocked(saveOnboardingAction).mock.calls.at(-1)?.[0];
  expect(Object.keys(failedPreferences ?? {})).toHaveLength(1);
  await waitFor(() => expect(screen.getByRole("button", { name: "Agora não" })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: "Agora não" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 5000 });
  expect(vi.mocked(saveOnboardingAction).mock.calls.at(-1)?.[0]).toEqual(failedPreferences);
});

it("erro de rede ao pular permanece inline", async () => {
  const user = userEvent.setup(); const onClose = vi.fn();
  vi.mocked(skipOnboardingAction).mockRejectedValueOnce(new Error("offline"));
  render(<OnboardingModal role="adult_student" userName="Ana" isOpen onClose={onClose} />);
  await waitFor(() => expect(screen.getByRole("button", { name: /Pular/ })).toBeEnabled());
  await user.click(screen.getByRole("button", { name: /Pular/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível salvar/);
  expect(onClose).not.toHaveBeenCalled();
});
