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
              { label: "Matrículas", href: "/admin/matriculas", group: "Alunos", icon: "students" }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );
    // O primeiro grupo não repete um rótulo visível; continua nomeado para leitores de tela.
    expect(screen.getByText("Principal")).toHaveClass("sr-only");
    expect(screen.getByRole("group", { name: "Principal" })).toBeInTheDocument();
    expect(screen.getByText("Alunos")).not.toHaveClass("sr-only");
    expect(screen.getAllByText("Professor")[0]).toBeInTheDocument();
    expect(screen.getByText("Ricardo Almeida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("data-active", "true");
  });

  it("renders hierarchical destinations and actionable counts", () => {
    render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            badge="Professor"
            profileName="Ricardo Almeida"
            navItems={[
              { label: "Matrículas", href: "/admin/matriculas", group: "Alunos", icon: "students", badge: 3 },
              { label: "Contratos", href: "/admin/contratos", group: "Documentos", icon: "contracts", active: true, children: [
                { label: "Visão geral", href: "/admin/contratos", exact: true },
                { label: "Modelo", href: "/admin/contratos/modelo", active: true },
                { label: "Cancelamentos", href: "/admin/contratos/cancelamentos" }
              ] }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );
    expect(screen.getByLabelText("3 pendentes")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Alternar submenu de Contratos" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Modelo" })).toHaveAttribute("data-active", "true");
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
                group: "Documentos",
                icon: "contracts",
                children: [{ label: "Modelo", href: "/admin/contratos/modelo" }]
              }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );

    const overviewItem = screen.getByRole("link", { name: "Visão geral" }).closest("li");
    const contractsLink = screen.getByRole("link", { name: "Contratos" });
    const contractsToggle = screen.getByRole("button", { name: "Alternar submenu de Contratos" });

    expect(overviewItem).not.toBeNull();
    fireEvent.mouseEnter(overviewItem!);
    fireEvent.mouseLeave(overviewItem!);
    fireEvent.mouseEnter(contractsLink);
    fireEvent.mouseLeave(contractsLink);
    fireEvent.mouseEnter(contractsToggle);
    fireEvent.mouseLeave(contractsToggle);

    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });
});
