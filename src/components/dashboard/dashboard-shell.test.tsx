import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/active-sidebar", () => ({
  ActiveSidebar: () => <aside aria-label="Sidebar mock" />,
}));

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NotificationTopButton } from "@/components/dashboard/notification-nav-item";

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
      return { ok: true, json: async () => ({ count: 1 }) };
    })
  );
});

describe("DashboardShell & NotificationTopButton", () => {
  it("não renderiza botão de alternar sidebar no cabeçalho", () => {
    render(
      <DashboardShell title="Visão geral" subtitle="Resumo da academia" badge="Professor">
        <p>Conteúdo principal</p>
      </DashboardShell>
    );

    expect(screen.getByRole("heading", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /toggle sidebar/i })).not.toBeInTheDocument();
  });

  it("exibe o botão fixo de notificações no canto superior direito e abre o sheet ao clicar", async () => {
    const user = userEvent.setup();
    render(<NotificationTopButton initialCount={2} />);

    const trigger = screen.getByRole("button", { name: /Avisos, 2 não lidos/i });
    expect(trigger).toHaveClass("fixed", "right-4", "top-4");

    await user.click(trigger);

    expect(await screen.findByText("Exame confirmado")).toBeVisible();
    expect(screen.getByText("Compareça às 9h com dobok.")).toBeVisible();
  });
});
