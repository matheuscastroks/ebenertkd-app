import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/active-sidebar", () => ({
  ActiveSidebar: () => <aside aria-label="Sidebar mock" />,
}));

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NotificationCountProvider } from "@/components/dashboard/notification-nav-item";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/notifications/inbox")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                notification: {
                  $id: "n1",
                  title: "Exame confirmado",
                  body: "Compareça às 9h com dobok.",
                  kind: "announcement",
                  audience: "all",
                  published_at: "2026-11-18T12:00:00Z",
                },
                recipient: { $id: "r1", read_at: null },
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ count: 2 }) };
    })
  );
});

describe("DashboardShell (moldura integrada à sidebar)", () => {
  it("integra o cabeçalho ao fundo da sidebar e isola o conteúdo no painel saltado", () => {
    const { container } = render(
      <NotificationCountProvider initialCount={2}>
        <DashboardShell
          title="Visão geral"
          subtitle="Resumo da academia"
          badge="Professor"
          headerActions={<button type="button">Nova turma</button>}
        >
          <p>Conteúdo principal</p>
        </DashboardShell>
      </NotificationCountProvider>
    );

    const header = container.querySelector("header");
    const main = container.querySelector("main[data-slot='dashboard-content']");

    expect(header).toHaveClass("bg-sidebar", "shrink-0");
    expect(main).toHaveClass("bg-background", "md:rounded-xl", "md:overflow-y-auto");
    expect(header).toContainElement(screen.getByRole("heading", { name: "Visão geral" }));
    expect(header).toContainElement(screen.getByRole("button", { name: "Nova turma" }));
    expect(header).toContainElement(screen.getByRole("button", { name: /Avisos, 2 não lidos/i }));
    expect(main).toContainElement(screen.getByText("Conteúdo principal"));
    expect(screen.queryByRole("button", { name: /toggle sidebar/i })).not.toBeInTheDocument();
  });

  it("abre o sheet de notificações ao clicar no sino no cabeçalho", async () => {
    const user = userEvent.setup();
    render(
      <NotificationCountProvider initialCount={2}>
        <DashboardShell title="Turmas" subtitle="Horários e chamadas" badge="Professor">
          <p>Lista de turmas</p>
        </DashboardShell>
      </NotificationCountProvider>
    );

    await user.click(screen.getByRole("button", { name: /Avisos, 2 não lidos/i }));

    expect(await screen.findByText("Exame confirmado")).toBeVisible();
    expect(screen.getByText("Compareça às 9h com dobok.")).toBeVisible();
  });
});
