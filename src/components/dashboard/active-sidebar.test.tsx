import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/financeiro/reajuste/campanha-1" }));
vi.mock("@/components/dashboard/logout-button", () => ({ LogoutButton: () => <button>Sair</button> }));

import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ActiveSidebar", () => {
  it("mantém a seção ativa nas telas de detalhe em pilha", () => {
    render(
      <TooltipProvider>
        <SidebarProvider>
          <ActiveSidebar
            badge="Professor"
            profileName="Ricardo Almeida"
            navItems={[
              { label: "Hoje", href: "/admin", exact: true },
              {
                label: "Financeiro",
                href: "/admin/financeiro",
                icon: "billing",
                segments: [
                  { label: "Cobranças", href: "/admin/financeiro" },
                  { label: "Reajuste", href: "/admin/financeiro/reajuste" }
                ]
              }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );

    expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Hoje" })).not.toHaveAttribute("data-active", "true");
    // Segmentos não viram submenus no sidebar.
    expect(screen.queryByRole("link", { name: "Reajuste" })).not.toBeInTheDocument();
  });
});
