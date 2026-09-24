import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/financeiro/configuracoes" }));
vi.mock("@/components/dashboard/logout-button", () => ({ LogoutButton: () => <button>Sair</button> }));

import { ActiveSidebar } from "@/components/dashboard/active-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("ActiveSidebar", () => {
  it("mantém o item da seção atual ativo nas páginas internas", () => {
    render(
      <TooltipProvider>
        <SidebarProvider>
          <ActiveSidebar
            badge="Professor"
            profileName="Ricardo Almeida"
            navItems={[
              { label: "Visão geral", href: "/admin" },
              { label: "Financeiro", href: "/admin/financeiro", icon: "billing", children: [
                { label: "Visão geral", href: "/admin/financeiro", exact: true },
                { label: "Configuração PIX", href: "/admin/financeiro/configuracoes" }
              ] }
            ]}
          />
        </SidebarProvider>
      </TooltipProvider>
    );

    expect(screen.getByRole("link", { name: "Financeiro" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Configuração PIX" })).toHaveAttribute("data-active", "true");
    expect(screen.getAllByRole("link", { name: "Visão geral" })[0]).not.toHaveAttribute("data-active", "true");
  });
});
