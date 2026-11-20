import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InstallModal } from "./install-modal";

vi.mock("./use-pwa-install", () => ({
  usePwaInstall: vi.fn(),
}));

import { usePwaInstall } from "./use-pwa-install";

describe("InstallModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe instruções específicas para iOS / Safari", () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isMounted: true,
      isStandalone: false,
      isIos: true,
      canInstall: true,
      hasNativePrompt: false,
      promptInstall: vi.fn(),
    });

    render(<InstallModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText("Instalar Ebener TKD")).toBeInTheDocument();
    expect(screen.getByText(/Como instalar no iPhone \/ iPad \(Safari\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Toque no botão/i)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeInTheDocument();
  });

  it("exibe botão de instalação nativo no Android / Chrome quando disponível", async () => {
    const promptInstall = vi.fn().mockResolvedValue("accepted");
    const onOpenChange = vi.fn();

    vi.mocked(usePwaInstall).mockReturnValue({
      isMounted: true,
      isStandalone: false,
      isIos: false,
      canInstall: true,
      hasNativePrompt: true,
      promptInstall,
    });

    const user = userEvent.setup();
    render(<InstallModal open={true} onOpenChange={onOpenChange} />);

    const button = screen.getByRole("button", { name: /Instalar Aplicativo Agora/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(promptInstall).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("informa quando o aplicativo já está instalado", () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isMounted: true,
      isStandalone: true,
      isIos: false,
      canInstall: false,
      hasNativePrompt: false,
      promptInstall: vi.fn(),
    });

    render(<InstallModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText(/O aplicativo já está instalado e rodando/i)).toBeInTheDocument();
  });
});
