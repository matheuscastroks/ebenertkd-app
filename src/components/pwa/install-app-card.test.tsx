import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InstallAppCard } from "./install-app-card";

vi.mock("./use-pwa-install", () => ({
  usePwaInstall: vi.fn(),
}));

import { usePwaInstall } from "./use-pwa-install";

describe("InstallAppCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o card de instalação quando ainda não está instalado", async () => {
    const promptInstall = vi.fn().mockResolvedValue("accepted");
    vi.mocked(usePwaInstall).mockReturnValue({
      isMounted: true,
      isStandalone: false,
      isIos: false,
      canInstall: true,
      hasNativePrompt: true,
      promptInstall,
    });

    const user = userEvent.setup();
    render(<InstallAppCard />);

    expect(screen.getByText("Instalar Ebener TKD no celular")).toBeInTheDocument();
    const installBtn = screen.getByRole("button", { name: /Instalar Aplicativo/i });
    expect(installBtn).toBeInTheDocument();

    await user.click(installBtn);
    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it("exibe badge de instalado quando já está em modo standalone", () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isMounted: true,
      isStandalone: true,
      isIos: false,
      canInstall: false,
      hasNativePrompt: false,
      promptInstall: vi.fn(),
    });

    render(<InstallAppCard />);

    expect(screen.getByText("Instalado")).toBeInTheDocument();
    expect(screen.getByText(/Você já está usando o aplicativo em modo instalado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver instruções/i })).toBeInTheDocument();
  });
});
