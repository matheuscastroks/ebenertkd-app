import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/logout-button", () => ({
  LogoutButton: () => <button>Sair da conta</button>,
}));

import { AccountMenu } from "@/components/dashboard/account-menu";
import { SidebarProvider } from "@/components/ui/sidebar";

describe("AccountMenu", () => {
  it("renders user information in sidebar footer trigger", () => {
    render(
      <SidebarProvider>
        <AccountMenu
          name="Mestre Kim"
          badge="Professor"
          email="kim@ebenertkd.com.br"
          role="admin"
        />
      </SidebarProvider>
    );

    expect(screen.getByText("Mestre Kim")).toBeInTheDocument();
    expect(screen.getByText("kim@ebenertkd.com.br")).toBeInTheDocument();
  });

  it("opens dropdown menu with contextual links on click", async () => {
    const user = userEvent.setup();

    render(
      <SidebarProvider>
        <AccountMenu
          name="Mestre Kim"
          badge="Professor"
          email="kim@ebenertkd.com.br"
          role="admin"
        />
      </SidebarProvider>
    );

    const trigger = screen.getByRole("button", { name: /Mestre Kim/i });
    await user.click(trigger);

    expect(screen.getByRole("menuitem", { name: /Configurações/i })).toHaveAttribute("href", "/configuracoes");
    expect(screen.getByRole("menuitem", { name: /Privacidade/i })).toHaveAttribute("href", "/privacidade");
    expect(screen.getByText("Sair da conta")).toBeInTheDocument();
  });

  it("keeps work destinations in the navigation instead of repeating them", async () => {
    const user = userEvent.setup();

    render(
      <SidebarProvider>
        <AccountMenu
          name="Carlos Silva"
          badge="Aluno"
          email="carlos@gmail.com"
          role="adult_student"
        />
      </SidebarProvider>
    );

    const trigger = screen.getByRole("button", { name: /Carlos Silva/i });
    await user.click(trigger);

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Configurações", "Privacidade"]);
    expect(screen.queryByRole("menuitem", { name: /Financeiro|Minha frequência|Avisos/i })).not.toBeInTheDocument();
  });
});
