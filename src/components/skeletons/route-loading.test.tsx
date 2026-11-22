import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/matriculas/retencao",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

import { NotificationCountProvider } from "@/components/dashboard/notification-nav-item";
import { NavItemsProvider } from "@/components/dashboard/section-nav";
import { RouteLoading } from "@/components/skeletons/route-loading";
import { navigationForProfile } from "@/lib/navigation/routes";

const adminItems = navigationForProfile({ role: "admin", capabilities: ["admin"] });

describe("RouteLoading", () => {
  it("keeps the real section title and segment tabs mounted when switching tabs", () => {
    mocks.pathname = "/admin/matriculas/retencao";
    render(
      <NotificationCountProvider initialCount={0}>
        <NavItemsProvider items={adminItems}>
          <RouteLoading />
        </NavItemsProvider>
      </NotificationCountProvider>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Alunos" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Seções de Alunos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fichas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Frequência e risco" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Documentos anuais" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acessos" })).toBeInTheDocument();
  });

  it("uses header skeleton without section tabs on stacked detail routes", () => {
    mocks.pathname = "/admin/matriculas/student-1";
    render(
      <NotificationCountProvider initialCount={0}>
        <NavItemsProvider items={adminItems}>
          <RouteLoading />
        </NavItemsProvider>
      </NotificationCountProvider>
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Seções de Alunos" })).not.toBeInTheDocument();
  });
});
