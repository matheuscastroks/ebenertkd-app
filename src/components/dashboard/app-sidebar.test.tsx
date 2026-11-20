import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/logout-button", () => ({ LogoutButton: () => <button>Sair</button> }));

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("AppSidebar", () => {
  it("groups authorized links and identifies the current profile", () => {
    render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            badge="Professor"
            profileName="Ricardo Almeida"
            navItems={[
              { label: "Visão geral", href: "/admin", group: "Principal", active: true },
              { label: "Matrículas", href: "/admin/matriculas", group: "Rotina", icon: "students" }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );
    // O primeiro grupo não repete um rótulo visível; continua nomeado para leitores de tela.
    expect(screen.getByText("Principal")).toHaveClass("sr-only");
    expect(screen.getByRole("group", { name: "Principal" })).toBeInTheDocument();
    expect(screen.getByText("Rotina")).not.toHaveClass("sr-only");
    expect(screen.getAllByText("Professor")[0]).toBeInTheDocument();
    expect(screen.getByText("Ricardo Almeida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("data-active", "true");
  });

  it("renders one level of sections, counts and the footer settings item", () => {
    render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            badge="Professor"
            profileName="Ricardo Almeida"
            navItems={[
              { label: "Alunos", href: "/admin/matriculas", group: "Rotina", icon: "students", badge: 3 },
              { label: "Contratos", href: "/admin/contratos/renovacoes", group: "Gestão", icon: "contracts", active: true, segments: [
                { label: "Renovações", href: "/admin/contratos/renovacoes" },
                { label: "Modelo", href: "/admin/contratos/modelo" }
              ] },
              { label: "Ajustes", href: "/admin/academia", group: "Rodapé", icon: "settings" }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );
    expect(screen.getByLabelText("3 pendentes")).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: "Contratos" })).toHaveAttribute("data-active", "true");
    expect(screen.queryByRole("link", { name: "Modelo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submenu/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Rodapé" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajustes" })).toBeInTheDocument();
  });

  it("starts and stops icon animations when hovering parent sidebar items", () => {
    const { container } = render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            badge="Professor"
            profileName="Ricardo Almeida"
            navItems={[
              { label: "Visão geral", href: "/admin", group: "Principal", icon: "dashboard", active: true },
              {
                label: "Contratos",
                href: "/admin/contratos",
                group: "Gestão",
                icon: "contracts"
              }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );

    const overviewItem = screen.getByRole("link", { name: "Visão geral" }).closest("li");
    const contractsLink = screen.getByRole("link", { name: "Contratos" });

    expect(overviewItem).not.toBeNull();
    fireEvent.mouseEnter(overviewItem!);
    fireEvent.mouseLeave(overviewItem!);
    fireEvent.mouseEnter(contractsLink);
    fireEvent.mouseLeave(contractsLink);

    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });

  it("omits notifications from the sidebar and renders no desktop collapse rail", () => {
    const { container } = render(
      <TooltipProvider>
        <SidebarProvider open={true}>
          <AppSidebar
            badge="Aluno"
            profileName="Camila Ferreira"
            navItems={[
              { label: "Visão geral", href: "/aluno", group: "Principal", icon: "dashboard", active: true },
              { label: "Avisos", href: "/avisos", group: "Principal", icon: "notifications", badge: 3 },
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );

    expect(screen.getByRole("link", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Avisos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Avisos/i })).not.toBeInTheDocument();
    expect(container.querySelector('[data-sidebar="rail"]')).toBeNull();
  });
});
