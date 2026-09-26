import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin"
}));

describe("MobileBottomNav", () => {
  it("renders mobile navigation tabs with Home, middle destinations, and Menu trigger", () => {
    render(
      <SidebarProvider>
        <MobileBottomNav
          navItems={[
            { label: "Visão geral", href: "/admin", group: "Principal", exact: true },
            { label: "Turmas", href: "/admin/turmas", group: "Treino", icon: "classes" },
            { label: "Financeiro", href: "/admin/financeiro", group: "Financeiro", icon: "billing" },
            { label: "Avisos", href: "/admin/avisos", group: "Sistema", icon: "notifications", badge: 4 }
          ]}
        />
      </SidebarProvider>
    );

    expect(screen.getByRole("navigation", { name: "Navegação móvel principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Início/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Turmas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Financeiro/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Avisos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menu completo" })).toBeInTheDocument();
    expect(screen.getByLabelText("4 notificações")).toHaveTextContent("4");
  });

  it("opens mobile sidebar drawer when Menu button is clicked", () => {
    function TestConsumer() {
      const { openMobile } = useSidebar();
      return (
        <div>
          <span data-testid="drawer-state">{openMobile ? "open" : "closed"}</span>
          <MobileBottomNav
            navItems={[
              { label: "Visão geral", href: "/admin", group: "Principal", exact: true }
            ]}
          />
        </div>
      );
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    expect(screen.getByTestId("drawer-state")).toHaveTextContent("closed");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu completo" }));
    expect(screen.getByTestId("drawer-state")).toHaveTextContent("open");
  });
});
