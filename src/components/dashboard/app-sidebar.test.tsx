import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.getByText("Alunos")).toBeInTheDocument();
    expect(screen.getByText("Ricardo Almeida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("data-active", "true");
  });
});
